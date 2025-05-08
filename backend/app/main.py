from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi import Request
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Paper, Author, PaperAuthors, Tags, PaperTags
from fastapi.middleware.cors import CORSMiddleware
from .utils.keyword_extraction import extract_keyword
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import date, datetime
import xml.etree.ElementTree as ET
import os
import requests
import hashlib

GROBID_URL = "http://localhost:8070/api/processFulltextDocument" 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AuthorInput(BaseModel):
    name: str

class PaperInput(BaseModel):
    title: str
    abstract: Optional[str] = None
    publication_date: Optional[date] = None
    pdf_filename: str  # From uploaded file
    pdf_hash: str
    authors: List[AuthorInput]
    keywords: List[str]

class AuthorOutput(BaseModel):
    name: str

    class Config:
        orm_mode = True

class PaperOutput(BaseModel):
    paper_id : int
    title: str
    authors: List[AuthorOutput]
    abstract: Optional[str]
    status : str
    keywords: Optional[List[str]] = []
    #collections : Optional[List[str]]
    isFavourite : bool
    addedDate : datetime
    publication_date: Optional[date]

    class Config:
        orm_mode = True


class UpdateFavouriteStatus(BaseModel):
    paper_id: int
    isFavourite: bool  

class UpdateStatus(BaseModel):
    paper_id: int
    new_status: str

class PaperIDResponse(BaseModel):
    paper_id: int

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def parse_tei(xml_data):
    root = ET.fromstring(xml_data)
    ns = {"tei": "http://www.tei-c.org/ns/1.0"}

    # Extract title
    title_el = root.find(".//tei:titleStmt/tei:title", ns)
    title = title_el.text if title_el is not None else None

    # Extract abstract
    abstract_el = root.find(".//tei:profileDesc/tei:abstract", ns)
    abstract = (
        "".join(abstract_el.itertext()).strip() if abstract_el is not None else None
    )

    # Extract keywords
    keywords = []
    for kw_el in root.findall(".//tei:profileDesc/tei:textClass/tei:keywords/tei:term", ns):
        if kw_el.text:
            keywords.append(kw_el.text.strip())

    # Extract authors
    authors = []
    for author_el in root.findall(".//tei:sourceDesc//tei:author", ns):
        name_el = author_el.find("tei:persName", ns)
        forenames = name_el.findall("tei:forename", ns) if name_el is not None else []
        surname_el = name_el.find("tei:surname", ns) if name_el is not None else None

        full_name = " ".join([fn.text for fn in forenames if fn.text]) + (
            " " + surname_el.text if surname_el is not None else ""
        )

        authors.append({
            "name": full_name.strip()
        })

    # Extract publication date
    pub_date_el = root.find(".//tei:sourceDesc//tei:date", ns)
    pub_date = pub_date_el.get("when") if pub_date_el is not None else None

    return {
        "title": title,
        "abstract": abstract,
        "keywords": keywords,
        "authors": authors,
        "publication_date": pub_date
    } 


@app.post("/extract/")
async def extract_fulltext(file: UploadFile = File(...)):
    # 1. Save uploaded file
    tmp_path = os.path.join(UPLOAD_DIR, file.filename)
    file_bytes = await file.read()
    with open(tmp_path, "wb") as out:
        out.write(file_bytes)

    # 2. Compute hash
    pdf_hash = hashlib.sha256(file_bytes).hexdigest()

    # 3. Send to Grobid
    try:
        resp = requests.post(
            GROBID_URL,
            files={"input": ("filename", file_bytes, "application/pdf")},
            timeout=120
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not resp.ok:
        raise HTTPException(status_code=502, detail="Grobid error: " + resp.text[:200])

    # 4. Parse TEI‑XML
    data = parse_tei(resp.content)

    # 5. If keywords are missing, extract from abstract
    if not data.get("keywords") and data.get("abstract"):
        try:
            extracted = extract_keyword(data["abstract"])
            if extracted:
                data["keywords"] = extracted
        except Exception as e:
            print("⚠️ Keyword extraction failed:", e)

    # 6. Return full response
    return JSONResponse(content={
        **data,
        "pdf_hash": pdf_hash,
        "pdf_filename": file.filename
    })


@app.post("/add-paper/", response_model=PaperIDResponse)
async def add_paper(payload: PaperInput, db: Session = Depends(get_db)):
    try:
        # Print the received payload for debugging
        print("Received payload:", payload)
        
        # Validate required fields
        if not payload.title:
            raise HTTPException(status_code=400, detail="Title is required")
            
        # 1. Check if the paper already exists
        if payload.pdf_hash:
            existing_paper = db.query(Paper).filter(Paper.pdf_hash == payload.pdf_hash).first()
            if existing_paper:
                raise HTTPException(status_code=409, detail="This paper already exists in the system.")
        
        # 2. Add paper
        pdf_path = os.path.join(UPLOAD_DIR, payload.pdf_filename) if payload.pdf_filename else ""
        paper = Paper(
            title=payload.title,
            abstract=payload.abstract,
            publication_date=payload.publication_date,
            pdf_path=pdf_path,
            pdf_hash=payload.pdf_hash,
            current_status="Unread",
            isFavourite=False
        )
        db.add(paper)
        db.commit()
        db.refresh(paper)
        
        # 3. Add authors and PaperAuthors
        try:
            for author_data in payload.authors:
                if not author_data.name or not author_data.name.strip():
                    continue  # Skip empty author names
                    
                author = db.query(Author).filter(Author.name == author_data.name.strip()).first()
                if not author:
                    author = Author(name=author_data.name.strip())
                    db.add(author)
                    db.commit()
                    db.refresh(author)
                db.add(PaperAuthors(paper_id=paper.paper_id, author_id=author.author_id))
        except Exception as author_error:
            print(f"Error with authors: {str(author_error)}")
            # Continue with the process even if there's an author error
        
        # 4. Add tags and PaperTags
        try:
            for kw in payload.keywords:
                if not kw or not kw.strip():
                    continue  # Skip empty keywords
                    
                kw_clean = kw.strip().lower()
                tag = db.query(Tags).filter(Tags.name == kw_clean).first()
                if not tag:
                    tag = Tags(name=kw_clean)
                    db.add(tag)
                    db.commit()
                    db.refresh(tag)
                db.add(PaperTags(paper_id=paper.paper_id, tag_id=tag.tag_id))
        except Exception as tag_error:
            print(f"Error with tags: {str(tag_error)}")
            # Continue with the process even if there's a tag error
        
        db.commit()
        
        # Return a consistent response format
        return {"paper_id": paper.paper_id}
    
    except HTTPException as e:
        # Rollback in case of HTTP exception
        db.rollback()
        print(f"HTTP Exception: {e.detail}")
        raise e
    except Exception as e:
        # Log the error for debugging
        print(f"Error adding paper: {str(e)}")
        # Rollback in case of error
        db.rollback()
        # Return a proper JSON error response
        raise HTTPException(status_code=500, detail=f"Error adding paper: {str(e)}")

def to_paper_output(paper: Paper) -> PaperOutput:
    return PaperOutput(
        paper_id = paper.paper_id,
        title=paper.title,
        authors=[AuthorOutput(name=author.name) for author in paper.authors],
        abstract=paper.abstract,
        status=paper.current_status,
        keywords=[tag.name for tag in paper.tags],
        #collections=[],
        isFavourite=paper.isFavourite,
        addedDate=paper.added_on,
        publication_date=paper.publication_date

    )

@app.get("/papers", response_model=List[PaperOutput])
def get_papers(db: Session = Depends(get_db)):
    db_papers = db.query(Paper).all()
    return [to_paper_output(paper) for paper in db_papers]

@app.post("/api/updateFavouriteStatus")
async def update_favourite_status(
    request: Request,
    update: UpdateFavouriteStatus,
    db: Session = Depends(get_db)
):
    try:
        paper = db.query(Paper).filter(Paper.paper_id == update.paper_id).first()
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")

        paper.isFavourite = update.isFavourite
        db.commit()
        db.refresh(paper)
        return {"message": "Favourite status updated successfully"}
    
    except Exception as e:
        print("❌ Exception occurred:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/api/updateStatus")
async def update_status(
    update: UpdateStatus,
    db: Session = Depends(get_db)
):
    try:
        paper = db.query(Paper).filter(Paper.paper_id == update.paper_id).first()
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")

        paper.current_status = update.new_status
        db.commit()
        db.refresh(paper)
        return {"message": f"Reading status updated to '{update.new_status}' successfully"}
    
    except Exception as e:
        print("Exception occurred:", e)
        return JSONResponse(status_code=500, content={"error": str(e)})
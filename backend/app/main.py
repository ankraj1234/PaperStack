from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import SessionLocal
from .schemas import PaperIDResponse, UpdateStatus, UpdateFavouriteStatus, PaperOutput, AuthorOutput, PaperInput, CollectionOutput
from .models import Paper, Author, PaperAuthors, Tags, PaperTags, Collection, PaperCollections
from .utils.keyword_extraction import extract_keyword
from typing import List
import xml.etree.ElementTree as ET
import os
import requests
import hashlib

GROBID_URL = "http://localhost:8070/api/processFulltextDocument" 

app = FastAPI()

UPLOAD_PATH = "C:/Users/ar041/ai-paper-system/uploads"
UPLOAD_DIR = "uploads"

if not os.path.exists(UPLOAD_PATH):
    os.makedirs(UPLOAD_PATH)

app.mount("/uploads", StaticFiles(directory=UPLOAD_PATH), name="uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    # Save uploaded file
    tmp_path = os.path.join(UPLOAD_DIR, file.filename)
    file_bytes = await file.read()
    with open(tmp_path, "wb") as out:
        out.write(file_bytes)

    # Compute hash
    pdf_hash = hashlib.sha256(file_bytes).hexdigest()

    # Send to Grobid
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

    # Parse TEI‑XML
    data = parse_tei(resp.content)

    # If keywords are missing, extract from abstract
    if not data.get("keywords") and data.get("abstract"):
        try:
            extracted = extract_keyword(data["abstract"])
            if extracted:
                data["keywords"] = extracted
        except Exception as e:
            print("Keyword extraction failed:", e)

    # Return full response
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
            
        # Check if the paper already exists
        if payload.pdf_hash:
            existing_paper = db.query(Paper).filter(Paper.pdf_hash == payload.pdf_hash).first()
            if existing_paper:
                raise HTTPException(status_code=409, detail="This paper already exists in the system.")
        
        # Add paper
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
        
        # Add authors and PaperAuthors
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
        
        # Add tags and PaperTags
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

        # Add collections and PaperCollections
        try:
            for cname in payload.collections:
                if not cname or not cname.strip():
                    continue  # Skip empty names
                    
                name_clean = cname.strip()
                collection = db.query(Collection).filter(Collection.name == name_clean).first()
                if not collection:
                    collection = Collection(name=name_clean)
                    db.add(collection)
                    db.commit()
                    db.refresh(collection)
                db.add(PaperCollections(paper_id=paper.paper_id, collection_id=collection.id))
        except Exception as col_error:
            print(f"Error with collections: {str(col_error)}")
        
        db.commit()
        
        return {"paper_id": paper.paper_id,
                "pdf_path" : paper.pdf_path}
    
    except HTTPException as e:
        db.rollback()
        print(f"HTTP Exception: {e.detail}")
        raise e
    except Exception as e:
        print(f"Error adding paper: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error adding paper: {str(e)}")

def to_paper_output(paper: Paper) -> PaperOutput:
    return PaperOutput(
        paper_id = paper.paper_id,
        title=paper.title,
        authors=[AuthorOutput(name=author.name) for author in paper.authors],
        abstract=paper.abstract,
        status=paper.current_status,
        keywords=[tag.name for tag in paper.tags],
        isFavourite=paper.isFavourite,
        addedDate=paper.added_on,
        publication_date=paper.publication_date,
        pdf_path=paper.pdf_path,
        collections=[collection.name for collection in paper.collections]
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
        print("Exception occurred:", e)
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
    

@app.delete("/papers/{paper_id}")
def delete_paper(paper_id: int, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.paper_id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    if paper.pdf_path and os.path.exists(paper.pdf_path):
        os.remove(paper.pdf_path)

    db.delete(paper)
    db.commit()
    return {"message": f"Paper {paper_id} deleted successfully"}

@app.get("/get-collections/", response_model=List[CollectionOutput])
def get_collections(db: Session = Depends(get_db)):
    collections = db.query(Collection).all()
    return collections
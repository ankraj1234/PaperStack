from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from sentence_transformers import SentenceTransformer

from .database import SessionLocal
from .schemas import PaperIDResponse, UpdateStatus, UpdateFavouriteStatus, PaperOutput, AuthorOutput, PaperInput, CollectionOutput, PaperCollectionUpdate, UploadRequest
from .models import Paper, Author, PaperAuthors, Tags, PaperTags, Collection, PaperCollections
from .utils.keyword_extraction import extract_keyword
from .utils.chatbot import answer_user_query

from typing import List, Dict, Any, Optional
import xml.etree.ElementTree as ET
import os
import requests
import hashlib
import fitz
import numpy as np
import faiss
import re
import pickle

GROBID_URL = "http://localhost:8070/api/processFulltextDocument" 
app = FastAPI()

FAISS_INDEX_PATH = "faiss_index.bin"
METADATA_PATH = "metadata_store.pkl"
VECTOR_ID_PATH = "current_vector_id.txt"

model = SentenceTransformer('all-mpnet-base-v2')
dimension = 768
index = faiss.IndexFlatIP(dimension) 
metadata_store = {}
current_vector_id = 0

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

@app.get("/paper_/{paper_id}", response_model=PaperOutput)
def get_paper(paper_id: int, db: Session = Depends(get_db)):
    db_papers = db.query(Paper).filter(Paper.paper_id == paper_id).first()
    return to_paper_output(db_papers)

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

@app.get("/paper-collections/{paper_id}", response_model=Dict[str, int])
def get_paper_collections(paper_id: int, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.paper_id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    collections = db.query(Collection).all()

    result = {}
    paper_collections = {c.id for c in paper.collections} 

    for collection in collections:
        result[collection.name] = 1 if collection.id in paper_collections else 0

    return result

@app.post("/update-paper-collections/")
def update_paper_collections(update_data: PaperCollectionUpdate, db: Session = Depends(get_db)):
    paper = db.query(Paper).filter(Paper.paper_id == update_data.paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Get all collections in DB
    all_collections = db.query(Collection).all()
    name_to_collection = {c.name: c for c in all_collections}

    # Current collection IDs the paper belongs to
    current_collection_ids = {c.id for c in paper.collections}

    for name, should_belong in update_data.collections.items():
        if name not in name_to_collection:
            continue
        collection = name_to_collection[name]

        if should_belong and collection.id not in current_collection_ids:
            paper.collections.append(collection)
        elif not should_belong and collection.id in current_collection_ids:
            paper.collections.remove(collection)

    db.commit()
    return {"status": "success", "paper_id": update_data.paper_id}

@app.post("/add-collection/", response_model=CollectionOutput)
def add_collection(collection: CollectionOutput, db: Session = Depends(get_db)):
    new_collection = Collection(**collection.dict())
    db.add(new_collection)
    db.commit()
    db.refresh(new_collection)
    return new_collection


@app.delete("/delete-collection/{collection_name}/")
def delete_collection(collection_name: str, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.name == collection_name).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(collection)
    db.commit()
    return {"message": f"Collection '{collection_name}' deleted successfully"}

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'\n\d+\n', ' ', text)
    return text.strip()

def chunk_text_paragraphwise(text: str, chunk_size=4000, overlap_sentences=6) -> List[str]:
    # Split into sentences by punctuation + whitespace
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    
    chunks = []
    current_chunk = []
    current_length = 0
    
    for i, sentence in enumerate(sentences):
        sentence_len = len(sentence)
        
        if current_length + sentence_len > chunk_size and current_chunk:
            # Join current chunk sentences
            chunk_text = " ".join(current_chunk).strip()
            chunks.append(chunk_text)
            
            # Overlap: keep last N sentences for next chunk
            overlap = current_chunk[-overlap_sentences:] if overlap_sentences < len(current_chunk) else current_chunk
            current_chunk = overlap.copy()
            current_length = sum(len(s) for s in current_chunk) + len(current_chunk) - 1  # add space count
        else:
            current_chunk.append(sentence)
            current_length += sentence_len + 1  # +1 for space

    # Add last chunk if any sentences remain
    if current_chunk:
        chunk_text = " ".join(current_chunk).strip()
        chunks.append(chunk_text)
    
    return chunks

def embed_text(texts: List[str]) -> np.ndarray:
    embeddings = model.encode(
        texts, 
        convert_to_numpy=True, 
        show_progress_bar=False,
        batch_size=32,
        normalize_embeddings=True
    )
    return embeddings.astype('float32')

def extract_chunks_from_pdf(pdf_path: str) -> List[str]:
    doc = fitz.open(pdf_path)
    full_text = ""
    
    for page in doc:
        page_text = page.get_text()
        if len(page_text.strip()) > 50:  # Skip mostly empty pages
            full_text += clean_text(page_text) + " "
    
    doc.close()
    
    chunks = chunk_text_paragraphwise(full_text, chunk_size=2000)
    return [chunk for chunk in chunks if len(chunk.strip()) > 100]

def paper_exists(paper_id: str) -> bool:
    for metadata in metadata_store.values():
        if metadata.get("paper_id") == paper_id:
            return True
    return False

def save_index_and_metadata():
    try:
        faiss.write_index(index, FAISS_INDEX_PATH)
        
        with open(METADATA_PATH, 'wb') as f:
            pickle.dump(dict(metadata_store), f)
        
        with open(VECTOR_ID_PATH, 'w') as f:
            f.write(str(current_vector_id))
            
        print("Index and metadata saved successfully")
    except Exception as e:
        print(f"Error saving index and metadata: {e}")

def load_index_and_metadata():
    global index, metadata_store, current_vector_id
    
    try:
        # Load FAISS index
        if os.path.exists(FAISS_INDEX_PATH):
            index = faiss.read_index(FAISS_INDEX_PATH)
            print(f"Loaded FAISS index with {index.ntotal} vectors")
        else:
            print("No existing FAISS index found, starting fresh")
        
        # Load metadata store
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, 'rb') as f:
                metadata_store.update(pickle.load(f))
            print(f"Loaded metadata for {len(metadata_store)} vectors")
        else:
            print("No existing metadata found, starting fresh")
        
        # Load current vector ID
        if os.path.exists(VECTOR_ID_PATH):
            with open(VECTOR_ID_PATH, 'r') as f:
                current_vector_id = int(f.read().strip())
            print(f"Loaded current vector ID: {current_vector_id}")
        else:
            current_vector_id = 0
            print("Starting with vector ID: 0")
            
    except Exception as e:
        print(f"Error loading index and metadata: {e}")

@app.post("/upload_paper")
async def upload_paper(data: UploadRequest):
    global current_vector_id
    
    # Check if paper already exists
    if paper_exists(data.paper_id):
        return {"status": "exists", "message": f"Paper with ID '{data.paper_id}' already exists"}
    
    try:
        chunks = extract_chunks_from_pdf(data.pdf_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")
    
    if not chunks:
        raise HTTPException(status_code=400, detail="No valid text content found in PDF")
    
    embeddings = embed_text(chunks)
    
    for i, chunk in enumerate(chunks):
        vector = embeddings[i].reshape(1, -1)
        index.add(vector)
        
        metadata_store[current_vector_id] = {
            "paper_id": data.paper_id,
            "text": chunk
        }
        current_vector_id += 1
    
    # Save to disk after adding new data
    save_index_and_metadata()
    
    return {"status": "success", "chunks_added": len(chunks)}

@app.on_event("startup")
async def startup_event():
    load_index_and_metadata()

@app.get("/storage_stats")
async def get_storage_stats():
    return {
        "total_vectors": index.ntotal,
        "metadata_entries": len(metadata_store),
        "current_vector_id": current_vector_id,
        "files_exist": {
            "faiss_index": os.path.exists(FAISS_INDEX_PATH),
            "metadata": os.path.exists(METADATA_PATH),
            "vector_id": os.path.exists(VECTOR_ID_PATH)
        }
    }

def search_similar_chunks(query: str, paper_id: str = None, top_k: int = 5) -> List[Dict[str, Any]]:
    if index.ntotal == 0:
        return []
    
    query_embedding = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
    query_vector = query_embedding.astype('float32')
    
    if paper_id:
        # When filtering by paper_id, we need to search through all chunks to find matches
        # Start with a reasonable number and increase if needed
        search_k = index.ntotal
        distances, indices = index.search(query_vector, search_k)
        
        results = []
        for distance, idx in zip(distances[0], indices[0]):
            if idx == -1:
                continue
                
            metadata = metadata_store.get(idx, {})
            
            if metadata.get("paper_id") == paper_id:
                results.append({
                    "text": metadata.get("text", ""),
                    "paper_id": metadata.get("paper_id", ""),
                    "similarity_score": float(distance)
                })
                
                if len(results) >= top_k:
                    break
        
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]
    
    else:
        distances, indices = index.search(query_vector, top_k)
        
        results = []
        for distance, idx in zip(distances[0], indices[0]):
            if idx == -1:
                continue
                
            metadata = metadata_store.get(idx, {})
            results.append({
                "text": metadata.get("text", ""),
                "paper_id": metadata.get("paper_id", ""),
                "similarity_score": float(distance)
            })

        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        return results[:top_k]

@app.post("/chatbot")
async def search_papers(query: str, paper_id: Optional[str] = None, top_k: int = 2):
    try:
        # Step 1: Retrieve top sections
        results = search_similar_chunks(query, paper_id, top_k)

        # Step 2: Answer the query using top sections
        answer = answer_user_query(query=query, top_sections=results)

        return answer

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
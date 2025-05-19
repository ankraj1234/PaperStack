from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime

class AuthorInput(BaseModel):
    name: str

class PaperInput(BaseModel):
    title: str
    abstract: Optional[str] = None
    publication_date: Optional[date] = None
    pdf_filename: str 
    pdf_hash: str
    authors: List[AuthorInput]
    keywords: List[str]
    collections: List[str]

class AuthorOutput(BaseModel):
    name: str

    class Config:
        from_attributes = True

class PaperOutput(BaseModel):
    paper_id : int
    title: str
    authors: List[AuthorOutput]
    abstract: Optional[str]
    status : str
    keywords: Optional[List[str]] = []
    isFavourite : bool
    addedDate : datetime
    publication_date: Optional[date]
    pdf_path: str
    collections: Optional[List[str]] = []

    class Config:
        from_attributes = True


class UpdateFavouriteStatus(BaseModel):
    paper_id: int
    isFavourite: bool  

class UpdateStatus(BaseModel):
    paper_id: int
    new_status: str

class PaperIDResponse(BaseModel):
    paper_id: int
    pdf_path: str

class CollectionOutput(BaseModel):
    name: str
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import UniqueConstraint
import hashlib
from datetime import datetime

Base = declarative_base()

class Paper(Base):
    __tablename__ = 'papers'

    paper_id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(1000), nullable=False)
    abstract = Column(String(10000))
    publication_date = Column(Date)
    pdf_path = Column(String(255))
    added_on = Column(DateTime, default=datetime.utcnow)  
    pdf_hash = Column(String(64), unique=True, nullable=False)  # 64 characters for SHA-256 hex
    current_status = Column(String(255))
    isFavourite = Column(Boolean, default=False)


    authors = relationship("Author", secondary="paper_authors", back_populates="papers")
    tags = relationship("Tags", secondary="paper_tags", back_populates="papers")
    collections = relationship("Collection", secondary="paper_collections", back_populates="papers")

    @property
    def keywords(self):
        return [tag.name for tag in self.tags]

class Author(Base):
    __tablename__ = "authors"

    author_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)  # Length constraint for name

    papers = relationship("Paper", secondary="paper_authors", back_populates="authors")


class PaperAuthors(Base):
    __tablename__ = "paper_authors"

    paper_id = Column(Integer, ForeignKey('papers.paper_id'), primary_key=True)
    author_id = Column(Integer, ForeignKey('authors.author_id'), primary_key=True)


class Tags(Base):
    __tablename__ = "tags"

    tag_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(500))

    papers = relationship("Paper", secondary="paper_tags", back_populates="tags")

class PaperTags(Base):
    __tablename__ = "paper_tags"

    paper_id = Column(Integer, ForeignKey('papers.paper_id'), primary_key=True)
    tag_id = Column(Integer, ForeignKey('tags.tag_id'), primary_key=True)

class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)

    papers = relationship("Paper", secondary="paper_collections", back_populates="collections")


class PaperCollections(Base):
    __tablename__ = "paper_collections"

    paper_id = Column(Integer, ForeignKey("papers.paper_id"), primary_key=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), primary_key=True)

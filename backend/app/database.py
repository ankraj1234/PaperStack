from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

# Replace with your MySQL connection URL
SQLALCHEMY_DATABASE_URL = "mysql://root:Y4ggrab&@localhost/paper_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=True)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)
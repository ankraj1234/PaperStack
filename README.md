<h1 align="center"> PaperStack: AI-Powered Research Paper Organizer</h1>
<p align="center"><strong>Read, annotate, and talk to your research papers—effortlessly.</strong></p>

PaperStack is an open-source AI-driven research assistant that helps you organize, annotate, and understand academic papers with ease. From intelligent metadata extraction to interactive paper-specific chat, PaperStack transforms your research workflow into a seamless, searchable, and smart experience—all starting with a single PDF upload.

![Demo Preview](demo.gif)

---

## ✨ Features

- **Metadata Extraction**: Extracts title, authors, abstract, keywords, and affiliations using GROBID.  
- **Organized Library**: Upload, manage, and group research papers by tags, topics, or folders.  
- **Smart PDF Annotation**: Read and highlight papers in-browser using @react-pdf-viewer.  
- **Chat with Your Paper**: Ask context-aware questions with RAG-powered responses.  
- **Keyword Standardization**: Maintains consistent tagging for improved search and grouping.  
- **Custom Upload Workflow**: Upload PDFs, extract metadata, and start interacting in a single flow.


---

## 🚀 Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/ankraj1234/PaperStack.git
cd paperstack

# 2. Start GROBID (for metadata extraction)
cd grobid/
./gradlew run
# GROBID will be available at http://localhost:8070

# 3. Start ans setup the backend (in the project root)
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
# Ensure your .env file is configured

# 4. Start the frontend
cd frontend
npm install   # Run only once
npm start
# App runs at http://localhost:3000
```

---

## 🧰 Tech Stack

- Frontend: React, CSS, @react-pdf-viewer
- Backend: FastAPI (Python), SQLAlchemy
- Database: MySQL
- PDF Parsing: GROBID
- Vector Store: FAISS

---

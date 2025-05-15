import React, { useState } from 'react';
import './AddPaperForm.css';
import axios from 'axios';

function AddPaperForm({ onAddPaper, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    publicationDate: '',
    journal: '',
    doi: '',
    pdfUrl: '',
    tags: '',
    collections: '',
  });

  const [pdfFile, setPdfFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!pdfFile) return;
  
    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', pdfFile);
  
    try {
      const response = await axios.post('http://localhost:8000/extract/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      const data = response.data;
  
      // Autofill the form with the extracted metadata and pdf_hash
      setFormData((prevData) => ({
        ...prevData,
        title: data.title || '',
        abstract: data.abstract || '',
        publicationDate: data.publication_date || '',
        authors: data.authors.map((author) => author.name).join(', ') || '',
        tags: data.keywords.join(', ') || '',
        pdf_hash: data.pdf_hash || '', // Store pdf_hash in formData
      }));
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to extract paper data.');
    } finally {
      setIsLoading(false);
    }
  };
  

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    // Format the publication date or use null if empty
    const publicationDate = formData.publicationDate 
      ? new Date(formData.publicationDate).toISOString().split('T')[0] // Format as YYYY-MM-DD
      : null;
  
    const newPaper = {
      title: formData.title,
      abstract: formData.abstract,
      publication_date: publicationDate,
      pdf_filename: pdfFile ? pdfFile.name : '',
      pdf_hash: formData.pdf_hash || '',
      authors: formData.authors.split(',').map((author) => ({ name: author.trim() })).filter((author) => author.name),
      keywords: formData.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag),
    };
  
    try {
      const response = await axios.post('http://localhost:8000/add-paper/', newPaper);
      console.log('Paper added successfully:', response.data);
      console.log('New Paper that is passed',newPaper);

      const newPaper1 = {
        paper_id:response.data.paper_id,
        title: newPaper.title,
        abstract: newPaper.abstract,
        publication_date: newPaper.publication_date,
        pdf_filename: newPaper.pdf_filename,
        pdf_hash: newPaper.pdf_hash,
        authors: newPaper.authors,
        keywords: newPaper.keywords,
        addedDate: new Date().toISOString(),  
        isFavourite: false,
        status: "Unread"
      }

      onAddPaper(newPaper1); // Notify parent component about the new paper
      onCancel(); // Close the form
    } catch (error) {
      console.error('Error adding paper:', error);
      
      if (error.response) {
        console.log('Full error response:', error.response);
        console.log('Status code:', error.response.status);
        console.log('Response data type:', typeof error.response.data);
        console.log('Response data:', error.response.data);
       
        const errorStr = JSON.stringify(error.response.data, null, 2);
        console.log('Stringified error:', errorStr);
        
        // Create a more robust error message
        let errorMessage;
        try {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data && error.response.data.detail) {
            errorMessage = error.response.data.detail;
          } else if (error.response.data && error.response.data.message) {
            errorMessage = error.response.data.message;
          } else {
            errorMessage = JSON.stringify(error.response.data);
          }
        } catch (e) {
          errorMessage = `Error parsing server response (Status: ${error.response.status})`;
        }
        
        alert(`Failed to add the paper: ${errorMessage}`);
      } else {
        console.log('No response from server. Network error:', error.message);
        alert(`Failed to add the paper: ${error.message || 'Network or client error'}`);
      }
    }
  };
  

  return (
    <div className="add-paper-modal">
      <div className="add-paper-form-container">
        <h2>Add New Paper</h2>
        <form onSubmit={handleSubmit} className="add-paper-form">
          
          {/* File Upload Section */}
          <div className="form-group file-upload-section">
            <label htmlFor="pdfFile">Upload Paper (PDF)</label>
            <input
              type="file"
              id="pdfFile"
              onChange={handleFileChange}
              accept="application/pdf"
              required
              className="file-input"
            />
            <button
              type="button"
              onClick={handleFileUpload}
              disabled={isLoading}
              className="extract-button"
            >
              {isLoading ? 'Loading...' : 'Extract Metadata'}
            </button>
          </div>

          {/* Title Section */}
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Authors Section */}
          <div className="form-group">
            <label htmlFor="authors">Authors *</label>
            <input
              type="text"
              id="authors"
              name="authors"
              value={formData.authors}
              onChange={handleChange}
              placeholder="Separate multiple authors with commas"
              required
            />
          </div>

          {/* Abstract Section */}
          <div className="form-group">
            <label htmlFor="abstract">Abstract</label>
            <textarea
              id="abstract"
              name="abstract"
              value={formData.abstract}
              onChange={handleChange}
              rows="4"
            />
          </div>

          {/* Tags Section */}
          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="Separate tags with commas"
            />
          </div>

          {/* Publication and Buttons */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="publicationDate">Publication Date</label>
              <input
                type="date"
                id="publicationDate"
                name="publicationDate"
                value={formData.publicationDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-buttons">
              <button type="button" onClick={onCancel} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button">
                Add Paper
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddPaperForm;

import React from 'react';
import Tag from '../Tag/Tag';
import './PaperCard.css';
import axios from 'axios';

function PaperCard({ paper, viewMode, toggleFavorite, updatePaperStatus, deletePaper }) {
  
  const getStatusIcon = (paperStatus) => {
    switch (paperStatus) {
      case 'Unread':
        return '⏳';
      case 'In Progress':
        return '📖';
      case 'Completed':
        return '✅';
      default:
        return '📄';
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    const payload = {
      paper_id: paper.paper_id,
      new_status: newStatus
    };
    
    console.log('Payload:', payload);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/updateStatus', 
        payload,  
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        
        updatePaperStatus(paper.paper_id, newStatus);
  
        console.log('Server Response:', response.data);
      }
    } catch (error) {
      console.error('Error updating status!');
      
      if (error.response) {
        console.error('Server responded with error:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
    }
  };
  

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  const getButtonClass = (btnStatus) =>
    `status-button ${btnStatus.toLowerCase()} ${paper.status === btnStatus ? 'active' : ''}`;

  return (
    <div className={`paper-card ${viewMode}-view`}>
      <div className="paper-card-header">
        <div className="paper-card-status">
          <span className="status-icon">{getStatusIcon(paper.status)}</span>
          <span className="status-text">{paper.status}</span>
        </div>

        <div className="paper-card-controls">
          <button className="delete-button" onClick={() => deletePaper(paper.paper_id)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 30 30">
              <path d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"></path>
            </svg>
          </button>

          <button 
            className="favorite-button" 
            onClick={() => toggleFavorite(paper.paper_id)}
            style={{ color: paper.isFavourite ? 'gold' : 'gray' }}
          >
            {paper.isFavourite ? '★' : '☆'}
          </button>
        </div>
      </div>

      <h3 className="paper-card-title">{paper.title}</h3>

      <div className="paper-card-dates">
        {paper.publication_date && (
          <span>Published: {formatDate(paper.publication_date)}</span>
        )}
        {paper.addedDate && (
          <>
            {paper.publication_date && <span> | </span>}
            <span>Added on: {formatDate(paper.addedDate)}</span>
          </>
        )}
      </div>

      <div className="paper-card-authors">
        {paper.authors.map((author) => author.name).join(', ')}
      </div>

      {paper.venue && (
        <div className="paper-card-venue">
          {paper.venue}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="paper-card-abstract">
          {paper.abstract}
        </div>
      )}

      <div className="paper-card-tags">
        {(paper.keywords || []).slice(0, 3).map((tag, index) => (
          <Tag key={index} name={tag} />
        ))}
      </div>

      <div className="paper-card-actions">
        <button 
          className={getButtonClass('Unread')}
          onClick={() => handleStatusUpdate('Unread')}
        >
          <span className="status-icon">⏳</span>
          <span className="status-text">Unread</span>
        </button>

        <button 
          className={getButtonClass('In Progress')}
          onClick={() => handleStatusUpdate('In Progress')}
        >
          <span className="status-icon">📖</span>
          <span className="status-text">Reading</span>
        </button>

        <button 
          className={getButtonClass('Completed')}
          onClick={() => handleStatusUpdate('Completed')}
        >
          <span className="status-icon">✅</span>
          <span className="status-text">Completed</span>
        </button>
      </div>
    </div>
  );
}

export default PaperCard;

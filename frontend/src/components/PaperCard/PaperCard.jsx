import React from 'react';
import Tag from '../Tag/Tag';
import './PaperCard.css';
import axios from 'axios';

function PaperCard({ paper, viewMode, toggleFavorite, updatePaperStatus }) {
  // Use the passed updatePaperStatus function, no need to define it here
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
    
    console.log('📦 Payload:', payload);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/updateStatus', 
        payload,  // No need to stringify as axios handles it automatically
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.status === 200) {
        
        updatePaperStatus(paper.paper_id, newStatus);
  
        console.log('✅ Status update successful!');
        console.log('🧾 Server Response:', response.data);
      }
    } catch (error) {
      console.error('❌ Error updating status!');
      
      if (error.response) {
        console.error('📨 Server responded with error:', error.response.status);
        console.error('📃 Response data:', error.response.data);
      } else if (error.request) {
        console.error('📡 No response received:', error.request);
      } else {
        console.error('⚙️ Error setting up request:', error.message);
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
        <button 
          className="favorite-button" 
          onClick={() => toggleFavorite(paper.paper_id)}
          style={{ color: paper.isFavourite ? 'gold' : 'gray' }}
        >
          {paper.isFavourite ? '★' : '☆'}
        </button>
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

import React from 'react';
import Tag from '../Tag/Tag';
import './PaperCard.css';

function PaperCard({ paper, viewMode }) {
  const getStatusIcon = (status) => {
    switch (status) {
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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  return (
    <div className={`paper-card ${viewMode}-view`}>
      <div className="paper-card-header">
        <div className="paper-card-status">
          <span className="status-icon">{getStatusIcon(paper.status)}</span>
          <span className="status-text">{paper.status}</span>
        </div>
        <button className="favorite-button">
          {paper.isFavorite ? '★' : '☆'}
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
        <button className="status-button unread">
          <span className="status-icon">⏳</span>
          <span className="status-text">Unread</span>
        </button>

        <button className="status-button reading">
          <span className="status-icon">📖</span>
          <span className="status-text">Reading</span>
        </button>

        <button className="action-button">
          <span className="action-icon">📄</span>
          <span className="action-text">Read</span>
        </button>
      </div>
    </div>
  );
}

export default PaperCard;

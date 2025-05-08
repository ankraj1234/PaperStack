// import React from 'react';
// import Tag from '../Tag/Tag';
// import './PaperCard.css';

// function PaperCard({ paper, viewMode, toggleFavorite }) {
//   const getStatusIcon = (status) => {
//     switch (status) {
//       case 'Unread':
//         return '⏳';
//       case 'In Progress':
//         return '📖';
//       case 'Completed':
//         return '✅';
//       default:
//         return '📄';
//     }
//   };

//   const formatDate = (dateStr) => {
//     if (!dateStr) return 'N/A';
//     const date = new Date(dateStr);
//     return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
//   };

//   return (
//     <div className={`paper-card ${viewMode}-view`}>
//       <div className="paper-card-header">
//         <div className="paper-card-status">
//           <span className="status-icon">{getStatusIcon(paper.status)}</span>
//           <span className="status-text">{paper.status}</span>
//         </div>
//         <button 
//           className="favorite-button" 
//           onClick={() => toggleFavorite(paper.paper_id)}
//           style={{ color: paper.isFavourite ? 'gold' : 'gray' }}
//         >
//           {paper.isFavourite ? '★' : '☆'}
//         </button>
//       </div>

//       <h3 className="paper-card-title">{paper.title}</h3>

//       <div className="paper-card-dates">
//         {paper.publication_date && (
//           <span>Published: {formatDate(paper.publication_date)}</span>
//         )}
//         {paper.addedDate && (
//           <>
//             {paper.publication_date && <span> | </span>}
//             <span>Added on: {formatDate(paper.addedDate)}</span>
//           </>
//         )}
//       </div>

//       <div className="paper-card-authors">
//         {paper.authors.map((author) => author.name).join(', ')}
//       </div>

//       {paper.venue && (
//         <div className="paper-card-venue">
//           {paper.venue}
//         </div>
//       )}

//       {viewMode === 'list' && (
//         <div className="paper-card-abstract">
//           {paper.abstract}
//         </div>
//       )}

//       <div className="paper-card-tags">
//         {(paper.keywords || []).slice(0, 3).map((tag, index) => (
//           <Tag key={index} name={tag} />
//         ))}
//       </div>

//       <div className="paper-card-actions">
//         <button className="status-button unread">
//           <span className="status-icon">⏳</span>
//           <span className="status-text">Unread</span>
//         </button>

//         <button className="status-button reading">
//           <span className="status-icon">📖</span>
//           <span className="status-text">Reading</span>
//         </button>

//         <button className="action-button">
//           <span className="action-icon">📄</span>
//           <span className="action-text">Read</span>
//         </button>
//       </div>
//     </div>
//   );
// }

// export default PaperCard;


import React, { useState } from 'react';
import Tag from '../Tag/Tag';
import './PaperCard.css';
import axios from 'axios';

function PaperCard({ paper, viewMode, toggleFavorite }) {
  const [status, setStatus] = useState(paper.status);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Unread': return '⏳';
      case 'In Progress': return '📖';
      case 'Completed': return '✅';
      default: return '📄';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
  };

  const updateStatus = async (newStatus) => {
    const payload = {
      paper_id: paper.paper_id,
      new_status: newStatus
    };
  
    console.log('🔄 Attempting to update status...');
    console.log('📦 Payload:', payload);
  
    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/updateStatus', 
        JSON.stringify(payload),
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
  
      console.log('✅ Status update successful!');
      console.log('🧾 Server Response:', response.data);
      setStatus(newStatus);
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
  

  const getButtonClass = (btnStatus) =>
    `status-button ${btnStatus.toLowerCase()} ${status === btnStatus ? 'active' : ''}`;

  return (
    <div className={`paper-card ${viewMode}-view`}>
      <div className="paper-card-header">
        <div className="paper-card-status">
          <span className="status-icon">{getStatusIcon(status)}</span>
          <span className="status-text">{status}</span>
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
          onClick={() => updateStatus('Unread')}
        >
          <span className="status-icon">⏳</span>
          <span className="status-text">Unread</span>
        </button>

        <button
          className={getButtonClass('In Progress')}
          onClick={() => updateStatus('In Progress')}
        >
          <span className="status-icon">📖</span>
          <span className="status-text">Reading</span>
        </button>

        <button
          className={getButtonClass('Completed')}
          onClick={() => updateStatus('Completed')}
        >
          <span className="action-icon">📄</span>
          <span className="action-text">Read</span>
        </button>
      </div>
    </div>
  );
}

export default PaperCard;

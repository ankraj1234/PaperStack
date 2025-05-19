import React from 'react';
import PaperCard from '../PaperCard/PaperCard'; 
import './PapersList.css';

function PapersList({
  papers = [],
  viewMode = 'list',
  onPaperClick = () => {},  
  onViewModeChange = () => {},
  sortOrder = 'Date Added',
  onSortChange = () => {},
  toggleFavorite = () => {},
  updatePaperStatus = () => {},
  deletePaper,
  collections,
}) {
  const validPapers = Array.isArray(papers) ? papers : [];

  return (
    <div className="papers-container">
      <div className="papers-header">
        <h2 className="papers-title">Papers ({validPapers.length})</h2>
        <div className="papers-actions">
          <div className="sort-dropdown">
            <span>Sort by:</span>
            <select 
              value={sortOrder} 
              onChange={(e) => onSortChange(e.target.value)}
              className="sort-select"
            >
              <option value="Date Added">Date Added</option>
              <option value="Publication Date">Publication Date</option>
              <option value="Title">Title</option>
            </select>
          </div>
          <div className="view-mode-buttons">
            <button 
              className={`view-mode-button ${viewMode === 'compact' ? 'active' : ''}`}
              onClick={() => onViewModeChange('compact')}
              title="Compact View"
            >
              ≡
            </button>
            <button 
              className={`view-mode-button ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button 
              className={`view-mode-button ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className={`papers-list ${viewMode}-view`}>
        {validPapers.length === 0 ? (
          <div className="no-papers">No papers found</div>
        ) : (
          validPapers.map(paper => (
            <PaperCard 
              key={paper.paper_id} 
              paper={paper} 
              viewMode={viewMode} 
              toggleFavorite={toggleFavorite} 
              updatePaperStatus={updatePaperStatus}
              deletePaper={deletePaper}
              onTitleClick={onPaperClick}
              collections={collections}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default PapersList;

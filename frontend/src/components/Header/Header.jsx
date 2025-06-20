import React from 'react';
import './Header.css';

function Header({ onAddPaperClick, sortOrder, searchQuery, setSearchQuery, setActiveTabId }) {
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setActiveTabId('papersList')
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          <i className="logo-icon">📄</i>
          <span className="logo-text">PaperStack</span>
        </div>
      </div>
      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search papers, authors, journals..." 
          value={searchQuery}
          onChange={handleSearchChange}
        />
        {searchQuery && (
          <button 
            className="clear-search-button"
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>
      <div className="header-right">
        <button className="add-paper-button" onClick={onAddPaperClick}>
          <i className="add-icon">+</i>
          <span>Add Paper</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
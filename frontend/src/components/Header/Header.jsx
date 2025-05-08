import React from 'react';
import './Header.css';

function Header({ onAddPaperClick, sortOrder }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button">
          <i className="menu-icon">≡</i>
        </button>
        <div className="logo">
          <i className="logo-icon">📄</i>
          <span className="logo-text">PaperOrganizer</span>
        </div>
      </div>
      <div className="search-container">
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search papers, authors, journals..." 
        />
      </div>
      <div className="header-right">
        {/* Attach onAddPaperClick to the Add Paper button */}
        <button className="add-paper-button" onClick={onAddPaperClick}>
          <i className="add-icon">+</i>
          <span>Add Paper</span>
        </button>
      </div>
    </header>
  );
}

export default Header;

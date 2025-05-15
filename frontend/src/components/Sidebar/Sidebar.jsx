import React from 'react';
import './Sidebar.css';

function Sidebar({
  onStatusSelect = () => {},
  onCollectionSelect = () => {},
  onTagSelect = () => {},
  selectedStatus = "All Papers",
  selectedCollection = null,
  selectedTag = null,
  favorites = [],
  onFavoritesClick = () => {},
  showFavoritesOnly = false
}) {
  const statuses = [
    { id: "all", name: "All Papers", icon: "📄" },
    { id: "unread", name: "Unread", icon: "⏳" },
    { id: "inProgress", name: "In Progress", icon: "📖" },
    { id: "completed", name: "Completed", icon: "✅" }
  ];
  
  
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h2 className="sidebar-section-title">READING STATUS</h2>
        <ul className="sidebar-list">
          {statuses.map(status => (
            <li 
              key={status.id} 
              className={`sidebar-list-item ${selectedStatus === status.name && !showFavoritesOnly ? 'active' : ''}`}
              onClick={() => onStatusSelect(status.name)}
            >
              <span className="sidebar-item-icon">{status.icon}</span>
              <span className="sidebar-item-name">{status.name}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="sidebar-section">
        <h2 className="sidebar-section-title">FAVORITES</h2>
        <ul className="sidebar-list">
          <li 
            className={`sidebar-list-item ${showFavoritesOnly ? 'active' : ''}`}
            onClick={onFavoritesClick}
          >
            <span className="sidebar-item-icon">⭐</span>
            <span className="sidebar-item-name">Favorites</span>
            <span className="sidebar-item-count">{Array.isArray(favorites) ? favorites.length : 0}</span>
          </li>
        </ul>
      </div>
      
    </div>
  );
}

export default Sidebar;
import React, { useState} from 'react';
import './Sidebar.css';

function Sidebar({
  onStatusSelect = () => {},
  onCollectionSelect = () => {},
  selectedStatus = "All Papers",
  selectedCollection = null,
  favorites = [],
  onFavoritesClick = () => {},
  showFavoritesOnly = false,
  collections = [],
  fetchCollections = () => {},
}) {
  const statuses = [
    { id: "all", name: "All Papers", icon: "📄" },
    { id: "unread", name: "Unread", icon: "⏳" },
    { id: "inProgress", name: "In Progress", icon: "📖" },
    { id: "completed", name: "Completed", icon: "✅" }
  ];

  const [showInput, setShowInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleAddCollection = async () => {
    if (!newCollectionName.trim()) return;

    try {
      const response = await fetch('http://127.0.0.1:8000/add-collection/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to add collection');
      }

      setNewCollectionName('');
      setShowInput(false);
      fetchCollections(); 
    } catch (error) {
      alert(error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddCollection();
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setNewCollectionName('');
    }
  };

  const deleteCollection = async (collectionName) => {
    try {
      const response = await fetch(`http://localhost:8000/delete-collection/${encodeURIComponent(collectionName)}/`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete collection');
      }
      fetchCollections();
    } catch (error) {
      console.error('Error deleting collection:', error.message);
      alert(error.message); 
    }
  };

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

      <div className="sidebar-section">
        <div className="sidebar-header">
          <h2 className="sidebar-section-title">COLLECTIONS</h2>
          <div className="sidebar-buttons">
            <button className="add-button" onClick={() => setShowInput(!showInput)}>+</button>
            <button onClick={fetchCollections} className="refresh-button">⟳</button>
          </div>
        </div>
        <div className="collection-scrollable">
          {showInput && (
            <input
              className="add-collection-input"
              type="text"
              placeholder="New collection name"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={handleKeyPress}
              autoFocus
            />
          )}
          <ul className="sidebar-list">
            {collections.length === 0 && (
              <li className="sidebar-list-item no-collections">No Collections Found</li>
            )}
            {collections.map(collection => (
              <li
                key={collection.value}
                className={`sidebar-list-item ${selectedCollection === collection.value ? 'active' : ''}`}
                onClick={() => onCollectionSelect(collection.value)}
              >
                <span className="sidebar-item-icon">📚</span>
                <span className="sidebar-item-name">{collection.label}</span>
                <button className="delete-button" onClick={() => deleteCollection(collection.value)}>🗑</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import PapersList from './components/PapersList/PapersList';
import AddPaperForm from './components/AddPaperForm/AddPaperForm';
import './App.css';

function App() {
  const [papers, setPapers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('All Papers');
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [sortOrder, setSortOrder] = useState('Date Added');
  const [viewMode, setViewMode] = useState('list');
  const [showAddPaperForm, setShowAddPaperForm] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const fetchPapers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/papers');
      const data = await response.json();
      setPapers(data);

      const initialFavorites = data.filter((paper) => paper.isFavourite);
      setFavorites(initialFavorites);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const toggleFavorite = async (paperId) => {
    try {
      const paperToUpdate = papers.find(p => p.paper_id === paperId);
      if (!paperToUpdate) return;
  
      const isFavourite = !paperToUpdate.isFavourite;
      const requestPayload = {
        paper_id: paperId,
        isFavourite: isFavourite,
      };
  
      console.log('Request Payload:', JSON.stringify(requestPayload));
  
      const response = await fetch('http://127.0.0.1:8000/api/updateFavouriteStatus', {
        method: 'POST',  // Change this to POST
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
  
      const responseData = await response.json();
      console.log('Response from backend:', responseData);
  
      if (response.ok) {
        setPapers(prevPapers =>
          prevPapers.map(p =>
            p.paper_id === paperId ? { ...p, isFavourite } : p
          )
        );
      } else {
        console.error('Failed to update favorite status');
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };
  
  const updatePaperStatus = (paperId, newStatus) => {
    setPapers(prevPapers =>
      prevPapers.map(p =>
        p.paper_id === paperId ? { ...p, status: newStatus } : p
      )
    );
  };
  
  
  const filteredPapers = papers.filter((paper) => {
    if (selectedStatus && selectedStatus !== 'All Papers' && paper.status !== selectedStatus) {
      return false;
    }
    if (selectedCollection && !paper.collections.includes(selectedCollection)) {
      return false;
    }
    if (selectedTag && !paper.tags.includes(selectedTag)) {
      return false;
    }
    return true;
  });

  const sortedPapers = [...filteredPapers].sort((a, b) => {
    if (sortOrder === 'Date Added') {
      return new Date(b.addedDate) - new Date(a.addedDate);
    } else if (sortOrder === 'Publication Date') {
      return new Date(b.publication_date) - new Date(a.publication_date);
    } else if (sortOrder === 'Title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    setSelectedCollection(null);
    setSelectedTag(null);
    setShowFavoritesOnly(false);
  };

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setSelectedStatus(null);
    setSelectedTag(null);
    setShowFavoritesOnly(false);
  };

  const handleTagSelect = (tag) => {
    setSelectedTag(tag);
    setSelectedStatus(null);
    setSelectedCollection(null);
    setShowFavoritesOnly(false);
  };

  const handleSortChange = (sort) => {
    setSortOrder(sort);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const toggleAddPaperForm = () => {
    setShowAddPaperForm((prev) => !prev);
  };

  const handleAddPaper = (newPaper) => {
    setPapers((prevPapers) => [newPaper, ...prevPapers]);
    if (newPaper.isFavourite) {
      setFavorites((prevFavorites) => [...prevFavorites, newPaper]);
    }
  };

  const toggleShowFavorites = () => {
    setShowFavoritesOnly((prev) => !prev);
    if (!showFavoritesOnly) {
      setSelectedStatus(null);
      setSelectedCollection(null);
      setSelectedTag(null);
    } else {
      setSelectedStatus('All Papers');
    }
  };

  const favoritePapers = papers.filter((paper) => paper.isFavourite);
  const displayPapers = showFavoritesOnly ? favoritePapers : sortedPapers;

  return (
    <div className="app">
      <Header
        onAddPaperClick={toggleAddPaperForm}
        onSortChange={handleSortChange}
        sortOrder={sortOrder}
      />
      <div className="app-content">
        <Sidebar
          onStatusSelect={handleStatusSelect}
          onCollectionSelect={handleCollectionSelect}
          onTagSelect={handleTagSelect}
          selectedStatus={selectedStatus}
          selectedCollection={selectedCollection}
          selectedTag={selectedTag}
          favorites={favoritePapers}
          onFavoritesClick={toggleShowFavorites}
          showFavoritesOnly={showFavoritesOnly}
        />

        {showAddPaperForm && (
          <AddPaperForm
            onAddPaper={handleAddPaper}
            onCancel={() => setShowAddPaperForm(false)}
          />
        )}

        <PapersList
          papers={displayPapers}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          toggleFavorite={toggleFavorite}
          updatePaperStatus={updatePaperStatus}
        />
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import PapersList from './components/PapersList/PapersList';
import AddPaperForm from "./components/AddPaperForm/AddPaperForm";
import './App.css';

function App() {
  const [papers, setPapers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("All Papers");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [sortOrder, setSortOrder] = useState("Date Added");
  const [viewMode, setViewMode] = useState("list");
  const [showAddPaperForm, setShowAddPaperForm] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const fetchPapers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/papers');
      const data = await response.json();
      setPapers(data);
      
      // Initialize favorites from fetched papers
      const initialFavorites = data.filter(paper => paper.isFavourite);
      setFavorites(initialFavorites);
    } catch (error) {
      console.error('Error fetching papers:', error);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  // Toggle favorite status of a paper
  const toggleFavorite = async (paperId) => {
    try {
      // Find the paper
      const paperToUpdate = papers.find(p => p.paper_id === paperId);
      if (!paperToUpdate) return;

      // Toggle the favorite status
      const updatedPaper = { 
        ...paperToUpdate, 
        isFavourite: !paperToUpdate.isFavourite 
      };

      // Update in API
      const response = await fetch(`http://127.0.0.1:8000/papers/${paperId}/favorite`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavourite: updatedPaper.isFavourite }),
      });

      if (response.ok) {
        // Update in local state
        setPapers(papers.map(p => 
          p.paper_id === paperId ? updatedPaper : p
        ));

        // Update favorites list
        setFavorites(prev => {
          if (updatedPaper.isFavourite) {
            return [...prev, updatedPaper];
          } else {
            return prev.filter(p => p.paper_id !== paperId);
          }
        });
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
    }
  };

  // Filter papers based on selected status, collection, or tag
  const filteredPapers = papers.filter(paper => {
    // Filter by status
    if (selectedStatus === "All Papers") {
      // No filtering for "All Papers"
    } else if (selectedStatus === "Unread" && paper.status !== "Unread") {
      return false;
    } else if (selectedStatus === "In Progress" && paper.status !== "In Progress") {
      return false;
    } else if (selectedStatus === "Completed" && paper.status !== "Completed") {
      return false;
    }

    // Filter by collection
    if (selectedCollection && !paper.collections.includes(selectedCollection)) {
      return false;
    }

    // Filter by tag
    if (selectedTag && !paper.tags.includes(selectedTag)) {
      return false;
    }

    return true;
  });

  // Sort papers
  const sortedPapers = [...filteredPapers].sort((a, b) => {
    if (sortOrder === "Date Added") {
      return new Date(b.addedDate) - new Date(a.addedDate);
    } else if (sortOrder === "Publication Date") {
      return new Date(b.publicationDate) - new Date(a.publicationDate);
    } else if (sortOrder === "Title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    setSelectedCollection(null);
    setSelectedTag(null);
    setShowFavoritesOnly(false); // Clear favorites filter when selecting status
  };

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setSelectedStatus(null);
    setSelectedTag(null);
    setShowFavoritesOnly(false); // Clear favorites filter when selecting collection
  };

  const handleTagSelect = (tag) => {
    setSelectedTag(tag);
    setSelectedStatus(null);
    setSelectedCollection(null);
    setShowFavoritesOnly(false); // Clear favorites filter when selecting tag
  };

  const handleSortChange = (sort) => {
    setSortOrder(sort);
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  // Toggle the add paper form visibility
  const toggleAddPaperForm = () => {
    setShowAddPaperForm(prev => !prev);
  };

  // Handle adding a new paper
  const handleAddPaper = (newPaper) => {
    setPapers(prevPapers => [newPaper, ...prevPapers]);
    if (newPaper.isFavourite) {
      setFavorites(prevFavorites => [...prevFavorites, newPaper]);
    }
  };

  // Toggle to show only favorite papers
  const toggleShowFavorites = () => {
    setShowFavoritesOnly(prev => !prev);
    if (!showFavoritesOnly) {
      // When enabling favorites view, clear other filters
      setSelectedStatus(null);
      setSelectedCollection(null);
      setSelectedTag(null);
    } else {
      // When disabling favorites view, go back to all papers
      setSelectedStatus("All Papers");
    }
  };

  // Get all favorite papers
  const favoritePapers = papers.filter(paper => paper.isFavourite);

  // Filter papers to show only favorites if `showFavoritesOnly` is true
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
          showFavoritesOnly={showFavoritesOnly} // Pass this to show active state
        />

        {/* Conditionally render the Add Paper Form */}
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
          toggleFavorite={toggleFavorite} // Pass toggleFavorite instead of updateFavorites
        />
      </div>
    </div>
  );
}

export default App;
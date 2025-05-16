import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import PapersList from './components/PapersList/PapersList';
import AddPaperForm from './components/AddPaperForm/AddPaperForm';
import PDFViewer from './components/PDFViewer/PDFViewer';

import './App.css';

function HomePage(props) {
  return (
    <>
      <Header
        onAddPaperClick={props.toggleAddPaperForm}
        onSortChange={props.handleSortChange}
        sortOrder={props.sortOrder}
        searchQuery={props.searchQuery}
        setSearchQuery={props.setSearchQuery}
      />
      <div className="app-content">
        <Sidebar
          onStatusSelect={props.handleStatusSelect}
          onCollectionSelect={props.handleCollectionSelect}
          onTagSelect={props.handleTagSelect}
          selectedStatus={props.selectedStatus}
          selectedCollection={props.selectedCollection}
          selectedTag={props.selectedTag}
          favorites={props.favoritePapers}
          onFavoritesClick={props.toggleShowFavorites}
          showFavoritesOnly={props.showFavoritesOnly}
        />

        {props.showAddPaperForm && (
          <AddPaperForm
            onAddPaper={props.handleAddPaper}
            onCancel={() => props.setShowAddPaperForm(false)}
          />
        )}

        <PapersList
          papers={props.displayPapers}
          viewMode={props.viewMode}
          onViewModeChange={props.handleViewModeChange}
          sortOrder={props.sortOrder}
          onSortChange={props.handleSortChange}
          toggleFavorite={props.toggleFavorite}
          updatePaperStatus={props.updatePaperStatus}
          deletePaper={props.deletePaper}
        />
      </div>
    </>
  );
}

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
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPapers = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/papers');
      const data = await response.json();
      setPapers(data);
      setFavorites(data.filter(paper => paper.isFavourite));
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
      const requestPayload = { paper_id: paperId, isFavourite };

      const response = await fetch('http://127.0.0.1:8000/api/updateFavouriteStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        setPapers(prev =>
          prev.map(p =>
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
    setPapers(prev =>
      prev.map(p =>
        p.paper_id === paperId ? { ...p, status: newStatus } : p
      )
    );
  };

  const deletePaper = async (paperId) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/papers/${paperId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPapers(prev => prev.filter(paper => paper.paper_id !== paperId));
      } else {
        console.error("Failed to delete paper");
      }
    } catch (error) {
      console.error("Error deleting paper:", error);
    }
  };

  const searchPapers = (papers, query) => {
    if (!query) return papers;
    const lowerQuery = query.toLowerCase();

    return papers.filter(paper => {
      return (
        (paper.title?.toLowerCase().includes(lowerQuery)) ||
        (paper.authors?.some(author => author?.name?.toLowerCase().includes(lowerQuery))) ||
        (paper.abstract?.toLowerCase().includes(lowerQuery)) ||
        (paper.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))) ||
        (paper.status?.toLowerCase().includes(lowerQuery))
      );
    });
  };

  const filteredPapers = papers.filter(paper => {
    if (selectedStatus && selectedStatus !== 'All Papers' && paper.status !== selectedStatus) {
      return false;
    }
    if (selectedCollection && paper.collections && !paper.collections.includes(selectedCollection)) {
      return false;
    }
    if (selectedTag && paper.keywords && !paper.keywords.includes(selectedTag)) {
      return false;
    }
    return true;
  });

  const searchFilteredPapers = searchQuery
    ? searchPapers(filteredPapers, searchQuery)
    : filteredPapers;

  const sortedPapers = [...searchFilteredPapers].sort((a, b) => {
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

  const handleSortChange = (sort) => setSortOrder(sort);
  const handleViewModeChange = (mode) => setViewMode(mode);
  const toggleAddPaperForm = () => setShowAddPaperForm(prev => !prev);
  const handleAddPaper = (newPaper) => {
    setPapers(prev => [newPaper, ...prev]);
    if (newPaper.isFavourite) {
      setFavorites(prev => [...prev, newPaper]);
    }
  };

  const toggleShowFavorites = () => {
    setShowFavoritesOnly(prev => !prev);
    if (!showFavoritesOnly) {
      setSelectedStatus(null);
      setSelectedCollection(null);
      setSelectedTag(null);
    } else {
      setSelectedStatus('All Papers');
    }
  };

  const favoritePapers = papers.filter(p => p.isFavourite);
  const searchedFavoritePapers = searchQuery
    ? searchPapers(favoritePapers, searchQuery)
    : favoritePapers;

  const displayPapers = showFavoritesOnly ? searchedFavoritePapers : sortedPapers;

  return (
    <Router>
      <div className="app">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                toggleAddPaperForm={toggleAddPaperForm}
                handleSortChange={handleSortChange}
                sortOrder={sortOrder}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleStatusSelect={handleStatusSelect}
                handleCollectionSelect={handleCollectionSelect}
                handleTagSelect={handleTagSelect}
                selectedStatus={selectedStatus}
                selectedCollection={selectedCollection}
                selectedTag={selectedTag}
                favoritePapers={favoritePapers}
                toggleShowFavorites={toggleShowFavorites}
                showFavoritesOnly={showFavoritesOnly}
                showAddPaperForm={showAddPaperForm}
                handleAddPaper={handleAddPaper}
                setShowAddPaperForm={setShowAddPaperForm}
                displayPapers={displayPapers}
                viewMode={viewMode}
                handleViewModeChange={handleViewModeChange}
                toggleFavorite={toggleFavorite}
                updatePaperStatus={updatePaperStatus}
                deletePaper={deletePaper}
              />
            }
          />
          <Route path="/view-pdf/:id" element={<PDFViewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

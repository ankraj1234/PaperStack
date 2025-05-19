import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom';

import Header from './components/Header/Header';
import Sidebar from './components/Sidebar/Sidebar';
import PapersList from './components/PapersList/PapersList';
import AddPaperForm from './components/AddPaperForm/AddPaperForm';
import PDFViewer from './components/PDFViewer/PDFViewer';
import TabsBar from './components/TabsBar/TabsBar';

import './App.css';

function HomePage(props) {
  const {
    toggleAddPaperForm,
    handleSortChange,
    sortOrder,
    searchQuery,
    setSearchQuery,
    handleStatusSelect,
    handleCollectionSelect,
    handleTagSelect,
    selectedStatus,
    selectedCollection,
    selectedTag,
    favoritePapers,
    toggleShowFavorites,
    showFavoritesOnly,
    showAddPaperForm,
    handleAddPaper,
    setShowAddPaperForm,
    displayPapers,
    viewMode,
    handleViewModeChange,
    toggleFavorite,
    updatePaperStatus,
    deletePaper,
    tabs,
    activeTabId,
    setActiveTabId,
    openPdfTab,
    closeTab,
    activeTab
  } = props;
  return (
    <>
      <Header
        onAddPaperClick={props.toggleAddPaperForm}
        onSortChange={props.handleSortChange}
        sortOrder={props.sortOrder}
        searchQuery={props.searchQuery}
        setSearchQuery={props.setSearchQuery}
        setActiveTabId={props.setActiveTabId}
      />
      <div className="app-content">
        <Sidebar
          style={{ width: 250, flexShrink: 0 }}
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

        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {props.showAddPaperForm && (
            <AddPaperForm
              onAddPaper={props.handleAddPaper}
              onCancel={() => props.setShowAddPaperForm(false)}
            />
          )}

          <div style={{ height:'6%' ,width: '100%', overflowX: 'hidden'}}>
            <TabsBar
              tabs={tabs}
              activeTabId={activeTabId}
              setActiveTabId={setActiveTabId}
              closeTab={closeTab}
            />
          </div>

          <div style={{ flexGrow: 1, overflowY: 'hidden'}}>
            {activeTabId === 'papersList' && (
              <PapersList
                papers={props.displayPapers}
                viewMode={props.viewMode}
                onViewModeChange={props.handleViewModeChange}
                sortOrder={props.sortOrder}
                onSortChange={props.handleSortChange}
                toggleFavorite={props.toggleFavorite}
                updatePaperStatus={props.updatePaperStatus}
                deletePaper={props.deletePaper}
                onPaperClick={props.openPdfTab}
              />
            )}

            {activeTab && activeTab.content === 'pdf' && (
              <PDFViewer pdfPath={activeTab.pdfPath} />
            )}
          </div>
        </div>
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
  const [tabs, setTabs] = useState([
    { id: 'papersList', title: 'Papers List', content: 'list' }
  ]);
  const [activeTabId, setActiveTabId] = useState('papersList');
  const activeTab = tabs.find(tab => tab.id === activeTabId);

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


  function openPdfTab(paper) {
    setTabs(prevTabs => {
      const existing = prevTabs.find(tab => tab.id === paper.paper_id);
      if (existing) {
        setActiveTabId(existing.id);
        return prevTabs;
      }

      return [
        ...prevTabs,
        {
          id: paper.paper_id,
          title: paper.title,
          content: 'pdf',
          pdfPath: paper.pdf_path,
        },
      ];
    });

    setActiveTabId(paper.paper_id);
  }


  // Close tab function
  function closeTab(id) {
    setTabs(prevTabs => {
      const filtered = prevTabs.filter(tab => tab.id !== id);
      // If closing active tab, activate last tab or Papers List
      if (activeTabId === id) {
        setActiveTabId(filtered.length ? filtered[filtered.length - 1].id : 'papersList');
      }
      return filtered;
    });
  }

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
    setActiveTabId('papersList');
  };

  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setSelectedStatus(null);
    setSelectedTag(null);
    setShowFavoritesOnly(false);
    setActiveTabId('papersList');
  };

  const handleTagSelect = (tag) => {
    setSelectedTag(tag);
    setSelectedStatus(null);
    setSelectedCollection(null);
    setShowFavoritesOnly(false);
    setActiveTabId('papersList');
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
    setActiveTabId('papersList');
  };

  const favoritePapers = papers.filter(p => p.isFavourite);
  const searchedFavoritePapers = searchQuery
    ? searchPapers(favoritePapers, searchQuery)
    : favoritePapers;

  const displayPapers = showFavoritesOnly ? searchedFavoritePapers : sortedPapers;

  return (
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
                tabs={tabs}
                activeTabId={activeTabId}
                setActiveTabId={setActiveTabId}
                openPdfTab={openPdfTab}
                closeTab={closeTab}
                activeTab={activeTab}
              />
            }
          />
        </Routes>
      </div>
  );
}

export default App;

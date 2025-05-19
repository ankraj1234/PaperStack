import React, { useRef, useEffect } from 'react';
import './TabsBar.css';

const TabsBar = ({ tabs, activeTabId, setActiveTabId, closeTab }) => {
  const tabsContainerRef = useRef(null);
  
  // Scroll to active tab when it changes
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeTab = tabsContainerRef.current.querySelector('.tab-item.active');
      if (activeTab) {
        const container = tabsContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        
        // Check if active tab is outside the visible area
        if (tabRect.left < containerRect.left) {
          // If tab is to the left of visible area
          container.scrollLeft += tabRect.left - containerRect.left;
        } else if (tabRect.right > containerRect.right) {
          // If tab is to the right of visible area
          container.scrollLeft += tabRect.right - containerRect.right;
        }
      }
    }
  }, [activeTabId]);

  return (
    <div className="tabs-bar-wrapper">
      <div className="tabs-container" ref={tabsContainerRef}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''}`}
            onClick={() => setActiveTabId(tab.id)}
            title={tab.title}
          >
            <span className="tab-title">{tab.title}</span>
            {tab.id !== 'papersList' && (
              <button
                className="tab-close-button"
                onClick={e => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                aria-label="Close tab"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TabsBar;
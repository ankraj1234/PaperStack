import React from 'react';
import './TabsBar.css';

function TabsBar({ openTabs, activeTabId, onTabClick, onCloseTab }) {
  return (
    <div className="tabs-bar">
      {openTabs.map(tab => (
        <div
          key={tab.paperId}
          className={`tab ${activeTabId === tab.paperId ? 'active' : ''}`}
          onClick={() => onTabClick(tab.paperId)}
        >
          {tab.title}
          <button onClick={(e) => { e.stopPropagation(); onCloseTab(tab.paperId); }}>×</button>
        </div>
      ))}
    </div>
  );
}

export default TabsBar;

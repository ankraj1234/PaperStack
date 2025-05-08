import React from 'react';
import './Tag.css';

function Tag({ name }) {
  // Function to get consistent color based on tag name
  const getTagColor = (tagName) => {
    const colors = {
      'Computer Vision': '#e8f5e9',
      'CNN': '#e3f2fd',
      'Generative Models': '#fce4ec',
      'BERT': '#e8eaf6',
      'Transformers': '#ede7f6',
      'Natural Language Processing': '#e0f7fa'
    };
    
    return colors[tagName] || '#f1f3f4';
  };
  
  const getTagTextColor = (tagName) => {
    const textColors = {
      'Computer Vision': '#2e7d32',
      'CNN': '#1565c0',
      'Generative Models': '#c2185b',
      'BERT': '#3949ab',
      'Transformers': '#5e35b1',
      'Natural Language Processing': '#00838f'
    };
    
    return textColors[tagName] || '#666666';
  };
  
  const tagStyle = {
    backgroundColor: getTagColor(name),
    color: getTagTextColor(name)
  };
  
  return (
    <div className="tag" style={tagStyle}>
      {name}
    </div>
  );
}

export default Tag;
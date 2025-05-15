import React from 'react';
import './Tag.css';

function Tag({ name }) {
  const tagStyle = {
    backgroundColor: '#f1f3f4',
    color: '#666666'           
  };
  
  return (
    <div className="tag" style={tagStyle}>
      {name}
    </div>
  );
}

export default Tag;
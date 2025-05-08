// Format date in a readable format
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Truncate text with ellipsis
  export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };
  
  // Extract authors for display
  export const formatAuthors = (authors, maxAuthors = 2) => {
    if (!authors || authors.length === 0) return '';
    
    if (authors.length <= maxAuthors) {
      return authors.join(', ');
    }
    
    return `${authors.slice(0, maxAuthors).join(', ')} et al.`;
  };
  
  // Get first letter from a name (for avatars)
  export const getInitials = (name) => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };
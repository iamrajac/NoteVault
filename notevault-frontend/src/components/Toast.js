import React from 'react';

function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;
  const bg = type === 'error' ? '#f44336' : type === 'success' ? '#4CAF50' : '#2196F3';
  return (
    <div style={{position:'fixed', bottom:20, right:20, background:bg, color:'#fff', padding:'10px 14px', borderRadius:6, boxShadow:'0 4px 12px rgba(0,0,0,0.2)', zIndex:3000}} onClick={onClose}>
      {message}
    </div>
  );
}

export default Toast;



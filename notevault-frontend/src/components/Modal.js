import React from 'react';

function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000}}>
      <div style={{background:'#fff', borderRadius:8, width:'min(600px, 92vw)', maxHeight:'80vh', overflow:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid #eee'}}>
          <h3 style={{margin:0}}>{title}</h3>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
        <div style={{padding:18}}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;



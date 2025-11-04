import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { projectAPI, noteAPI, statusRequestAPI } from '../services/api';
import Modal from '../components/Modal';
import './Pages.css';

function Projects() {
  const { isAdmin, isTeamLead } = useAuth();
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', status: 'ACTIVE' });
  const [editingId, setEditingId] = useState(null);
  const [notesModalProject, setNotesModalProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [requestProject, setRequestProject] = useState(null);
  const [requestStatus, setRequestStatus] = useState('IN_PROGRESS');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await projectAPI.update(editingId, formData);
      } else {
        await projectAPI.create(formData);
      }
      setFormData({ name: '', description: '', status: 'ACTIVE' });
      setEditingId(null);
      setShowForm(false);
      loadProjects();
    } catch (error) {
      console.error('Error saving project:', error);
      alert('Error saving project');
    }
  };

  const handleEdit = (project) => {
    setFormData({ name: project.name, description: project.description, status: project.status });
    setEditingId(project.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectAPI.delete(id);
        loadProjects();
      } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project');
      }
    }
  };

  const openNotes = async (project) => {
    setNotesModalProject(project);
    setNoteText('');
    try {
      const res = await noteAPI.getByProject(project.id);
      setNotes(res.data);
    } catch (e) {
      console.error('Error loading project notes:', e);
      setNotes([]);
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !notesModalProject) return;
    try {
      await noteAPI.create({ content: noteText.trim(), projectId: notesModalProject.id });
      const res = await noteAPI.getByProject(notesModalProject.id);
      setNotes(res.data);
      setNoteText('');
    } catch (e) {
      console.error('Error adding project note:', e);
      alert('Failed to add note');
    }
  };

  const openRequestProjectStatus = (project) => {
    setRequestProject(project);
    setRequestStatus(project.status);
  };

  const submitProjectRequest = async () => {
    if (!requestProject) return;
    try {
      await statusRequestAPI.create({ targetType: 'PROJECT', targetId: requestProject.id, requestedStatus: requestStatus });
      setRequestProject(null);
      alert('Status change request submitted');
    } catch (e) {
      console.error('Error requesting project status change:', e);
      alert('Failed to submit request');
    }
  };

  return (
    <div className="container main-content">
      <div className="page-header">
        <h1>Projects</h1>
        {(isAdmin() || isTeamLead()) && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
            {showForm ? 'Cancel' : '+ New Project'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <h2>{editingId ? 'Edit Project' : 'Create New Project'}</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Project Name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="4"
            />
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button type="submit" className="btn-primary">
              {editingId ? 'Update' : 'Create'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Team Lead</th>
              <th>Created</th>
              {(isAdmin() || isTeamLead()) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {projects.map(project => (
              <tr key={project.id}>
                <td><strong>{project.name}</strong></td>
                <td>{project.description || '-'}</td>
                <td>
                  <span className={`status-badge status-${project.status.toLowerCase().replace('_', '-')}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </td>
                <td>{project.teamLead.fullName}</td>
                <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                {(isAdmin() || isTeamLead()) ? (
                  <td>
                    <button className="btn-secondary" onClick={() => handleEdit(project)}>Edit</button>
                    {' '}
                    <button className="btn-danger" onClick={() => handleDelete(project.id)}>Delete</button>
                    {' '}
                    <button className="btn-primary" onClick={() => openNotes(project)}>Notes</button>
                  </td>
                ) : (
                  <td>
                    <span className={`status-badge status-${project.status.toLowerCase().replace('_','-')}`} style={{marginRight:8}}>{project.status.replace('_',' ')}</span>
                    <button className="btn-secondary" onClick={() => openRequestProjectStatus(project)}>Request</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!notesModalProject}
        title={notesModalProject ? `Project Notes • ${notesModalProject.name}` : 'Project Notes'}
        onClose={() => setNotesModalProject(null)}
      >
        <div style={{display:'flex', gap:12, marginBottom:12}}>
          <input
            type="text"
            placeholder="Add a note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button className="btn-primary" onClick={addNote}>Add</button>
        </div>
        {notes.length === 0 ? (
          <div style={{color:'#7f8c8d'}}>No notes yet.</div>
        ) : (
          <div className="card" style={{margin:0}}>
            {notes.map(n => (
              <div key={n.id} style={{padding:'8px 0', borderBottom:'1px solid #eee'}}>
                <div style={{fontSize:14}}>{n.content}</div>
                <div style={{fontSize:12, color:'#7f8c8d'}}>By {n.createdBy?.fullName || '—'} on {new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={!!requestProject}
        title={requestProject ? `Request Status • ${requestProject.name}` : 'Request Status'}
        onClose={() => setRequestProject(null)}
      >
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <span>Current:</span>
          <span className={`status-badge status-${(requestProject?.status||'').toLowerCase().replace('_','-')}`}>{requestProject?.status?.replace('_',' ')}</span>
        </div>
        <div style={{marginTop:12, display:'flex', gap:12}}>
          <select value={requestStatus} onChange={(e)=> setRequestStatus(e.target.value)}>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button className="btn-primary" onClick={submitProjectRequest}>Submit Request</button>
        </div>
      </Modal>
    </div>
  );
}

export default Projects;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { milestoneAPI, projectAPI } from '../services/api';
import './Pages.css';

function Milestones() {
  const { isAdmin, isTeamLead } = useAuth();
  const [milestones, setMilestones] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', projectId: '', deadline: '', status: 'NOT_STARTED'
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadMilestones();
    if (isAdmin() || isTeamLead()) {
      loadProjects();
    }
  }, [isAdmin, isTeamLead]);

  useEffect(() => {
    if ((isAdmin() || isTeamLead()) && projects.length > 0 && showForm && !formData.projectId) {
      setFormData(prev => ({ ...prev, projectId: String(projects[0].id) }));
    }
  }, [projects, showForm, isAdmin, isTeamLead]);

  const loadMilestones = async () => {
    try {
      const response = await milestoneAPI.getAll();
      setMilestones(response.data);
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  };

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
        await milestoneAPI.update(editingId, formData);
      } else {
        await milestoneAPI.create(formData);
      }
      setFormData({ name: '', description: '', projectId: '', deadline: '', status: 'NOT_STARTED' });
      setEditingId(null);
      setShowForm(false);
      loadMilestones();
    } catch (error) {
      console.error('Error saving milestone:', error);
      alert('Error saving milestone');
    }
  };

  const handleEdit = (m) => {
    setFormData({
      name: m.name,
      description: m.description || '',
      projectId: m.project?.id || '',
      deadline: m.deadline,
      status: m.status
    });
    setEditingId(m.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this milestone?')) {
      try {
        await milestoneAPI.delete(id);
        loadMilestones();
      } catch (error) {
        console.error('Error deleting milestone:', error);
        alert('Error deleting milestone');
      }
    }
  };

  return (
    <div className="container main-content">
      <div className="page-header">
        <h1>Milestones</h1>
        {(isAdmin() || isTeamLead()) && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
            {showForm ? 'Cancel' : '+ New Milestone'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <h2>{editingId ? 'Edit Milestone' : 'Create New Milestone'}</h2>
          <form onSubmit={handleSubmit}>
            {(isAdmin() || isTeamLead()) && (
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                required
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              placeholder="Milestone Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
            />
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              required
            />
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DELAYED">Delayed</option>
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
              <th>Project</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Created</th>
              {(isAdmin() || isTeamLead()) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {milestones.map(m => (
              <tr key={m.id}>
                <td><strong>{m.name}</strong></td>
                <td>{m.project?.name || '-'}</td>
                <td>{new Date(m.deadline).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge status-${m.status.toLowerCase().replace('_', '-')}`}>
                    {m.status.replace('_', ' ')}
                  </span>
                </td>
                <td>{new Date(m.createdAt).toLocaleDateString()}</td>
                {(isAdmin() || isTeamLead()) && (
                  <td>
                    <button className="btn-secondary" onClick={() => handleEdit(m)}>Edit</button>{' '}
                    <button className="btn-danger" onClick={() => handleDelete(m.id)}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Milestones;



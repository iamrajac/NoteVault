import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { taskAPI, milestoneAPI, userAPI, projectAPI, noteAPI, statusRequestAPI } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import './Pages.css';

function Tasks() {
  const { isAdmin, isTeamLead, isEmployee } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '', description: '', projectId: '', milestoneId: '', assignedToId: '',
    deadline: '', status: 'TODO', priority: 1
  });
  const [editingId, setEditingId] = useState(null);
  const [notesModalTask, setNotesModalTask] = useState(null);
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    query: '', status: 'ALL', assigneeId: 'ALL', projectId: 'ALL'
  });
  const [requestTask, setRequestTask] = useState(null);
  const [requestStatus, setRequestStatus] = useState('IN_PROGRESS');

  useEffect(() => {
    loadTasks();
    if (isAdmin() || isTeamLead()) {
      loadProjects();
      loadEmployees();
    }
  }, [isAdmin, isTeamLead]);

  // When projects load and form is open (or about to open), auto-select first project and preload milestones
  useEffect(() => {
    if ((isAdmin() || isTeamLead()) && projects.length > 0 && showForm && !formData.projectId) {
      const firstId = String(projects[0].id);
      setFormData(prev => ({ ...prev, projectId: firstId }));
      loadMilestonesByProject(firstId);
    }
  }, [projects, showForm, isAdmin, isTeamLead]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = isEmployee() ? await taskAPI.getMy() : await taskAPI.getAll();
      const data = response.data;
      setTasks(data);
      setFilteredTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
    finally {
      setLoading(false);
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

  // Apply client-side filters
  useEffect(() => {
    let list = [...tasks];
    if (filters.projectId !== 'ALL') {
      list = list.filter(t => String(t.milestone?.project?.id) === String(filters.projectId));
    }
    if (filters.assigneeId !== 'ALL') {
      list = list.filter(t => String(t.assignedTo?.id) === String(filters.assigneeId));
    }
    if (filters.status !== 'ALL') {
      list = list.filter(t => t.status === filters.status);
    }
    if (filters.query.trim()) {
      const q = filters.query.toLowerCase();
      list = list.filter(t => (t.title || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
    }
    setFilteredTasks(list);
  }, [filters, tasks]);

  const loadMilestonesByProject = async (projectId) => {
    try {
      if (!projectId) {
        setMilestones([]);
        return;
      }
      const response = await milestoneAPI.getByProject(projectId);
      setMilestones(response.data);
    } catch (error) {
      console.error('Error loading milestones:', error);
      setMilestones([]);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await userAPI.getAllUsers();
      setEmployees(response.data.filter(u => u.role === 'EMPLOYEE'));
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const openNotes = async (task) => {
    setNotesModalTask(task);
    setNoteText('');
    try {
      const res = await noteAPI.getByTask(task.id);
      setNotes(res.data);
    } catch (e) {
      console.error('Error loading notes:', e);
      setNotes([]);
    }
  };

  const openRequestTaskStatus = (task) => {
    setRequestTask(task);
    setRequestStatus(task.status);
  };

  const submitTaskRequest = async () => {
    if (!requestTask) return;
    try {
      await statusRequestAPI.create({ targetType: 'TASK', targetId: requestTask.id, requestedStatus: requestStatus });
      setToast({ message: 'Status change request submitted', type: 'success' });
      setRequestTask(null);
    } catch (e) {
      console.error('Error requesting status change:', e);
      setToast({ message: 'Failed to submit request', type: 'error' });
    }
  };

  const addNote = async () => {
    if (!noteText.trim() || !notesModalTask) return;
    try {
      await noteAPI.create({ content: noteText.trim(), taskId: notesModalTask.id });
      const res = await noteAPI.getByTask(notesModalTask.id);
      setNotes(res.data);
      setNoteText('');
      setToast({ message: 'Note added', type: 'success' });
    } catch (e) {
      console.error('Error adding note:', e);
      setToast({ message: 'Failed to add note', type: 'error' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await taskAPI.update(editingId, formData);
      } else {
        await taskAPI.create(formData);
      }
      setFormData({ title: '', description: '', projectId: '', milestoneId: '', assignedToId: '', deadline: '', status: 'TODO', priority: 1 });
      setEditingId(null);
      setShowForm(false);
      loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error saving task');
    }
  };

  const handleEdit = (task) => {
    setFormData({
      title: task.title,
      description: task.description,
      projectId: task.milestone?.project?.id || '',
      milestoneId: task.milestone.id,
      assignedToId: task.assignedTo.id,
      deadline: task.deadline,
      status: task.status,
      priority: task.priority
    });
    setEditingId(task.id);
    setShowForm(true);
    loadMilestonesByProject(task.milestone?.project?.id);
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      await taskAPI.update(taskId, {
        title: task.title,
        description: task.description,
        milestoneId: task.milestone.id,
        assignedToId: task.assignedTo.id,
        deadline: task.deadline,
        status: newStatus,
        priority: task.priority
      });
      loadTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  return (
    <div className="container main-content">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message:'', type:'info' })} />
      <div className="page-header">
        <h1>{isEmployee() ? 'My Tasks' : 'All Tasks'}</h1>
        {(isAdmin() || isTeamLead()) && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditingId(null); }}>
            {showForm ? 'Cancel' : '+ New Task'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="card">
          <h2>{editingId ? 'Edit Task' : 'Create New Task'}</h2>
          <form onSubmit={handleSubmit}>
            {(isAdmin() || isTeamLead()) && (
              <select
                value={formData.projectId}
                onChange={(e) => {
                  const pid = e.target.value;
                  setFormData({ ...formData, projectId: pid, milestoneId: '' });
                  loadMilestonesByProject(pid);
                }}
                required
              >
                <option value="">Select Project</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            {formData.projectId && milestones.length === 0 && (
              <div style={{fontSize: '13px', color: '#7f8c8d'}}>
                No milestones found in the selected project. Please add a milestone first.
              </div>
            )}
            <input
              type="text"
              placeholder="Task Title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows="3"
            />
            <select
              value={formData.milestoneId}
              onChange={(e) => setFormData({...formData, milestoneId: e.target.value})}
              required
            >
              <option value="">Select Milestone</option>
              {milestones.length === 0 && formData.projectId && (
                <option disabled value="">No milestones in selected project</option>
              )}
              {milestones.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <select
              value={formData.assignedToId}
              onChange={(e) => setFormData({...formData, assignedToId: e.target.value})}
              required
            >
              <option value="">Assign To</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.fullName}</option>
              ))}
            </select>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
              required
            />
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
            </select>
            <input
              type="number"
              placeholder="Priority (1-5)"
              min="1"
              max="5"
              value={formData.priority}
              onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
            />
            <button type="submit" className="btn-primary">
              {editingId ? 'Update' : 'Create'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{display:'flex', gap:12, flexWrap:'wrap', marginBottom:12}}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            style={{flex:'1 1 240px'}}
          />
          <select value={filters.projectId} onChange={(e)=> setFilters({ ...filters, projectId: e.target.value })}>
            <option value="ALL">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filters.assigneeId} onChange={(e)=> setFilters({ ...filters, assigneeId: e.target.value })}>
            <option value="ALL">All Assignees</option>
            {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
          </select>
          <select value={filters.status} onChange={(e)=> setFilters({ ...filters, status: e.target.value })}>
            <option value="ALL">All Status</option>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Assigned To</th>
              <th>Milestone</th>
              <th>Deadline</th>
              <th>Priority</th>
              <th>Status</th>
              {(isAdmin() || isTeamLead()) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin()||isTeamLead()?7:6}>Loading tasks...</td></tr>
            ) : filteredTasks.length === 0 ? (
              <tr><td colSpan={isAdmin()||isTeamLead()?7:6}>No tasks found.</td></tr>
            ) : filteredTasks.map(task => (
              <tr key={task.id}>
                <td><strong>{task.title}</strong></td>
                <td>{task.assignedTo.fullName}</td>
                <td>{task.milestone.name}</td>
                <td>{new Date(task.deadline).toLocaleDateString()}</td>
                <td>P{task.priority}</td>
                <td>
                  {isEmployee() ? (
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <span className={`status-badge status-${task.status.toLowerCase().replace('_', '-')}`}>{task.status.replace('_',' ')}</span>
                      <button className="btn-secondary" onClick={() => openRequestTaskStatus(task)}>Request</button>
                    </div>
                  ) : (
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(task.id, e.target.value)}
                      className={`status-badge status-${task.status.toLowerCase().replace('_', '-')}`}
                    >
                      <option value="TODO">TODO</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>
                  )}
                </td>
                {(isAdmin() || isTeamLead()) && (
                  <td>
                    <button className="btn-secondary" onClick={() => handleEdit(task)}>Edit</button>
                    {' '}
                    <button className="btn-primary" onClick={() => openNotes(task)}>Notes</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!notesModalTask}
        title={notesModalTask ? `Notes • ${notesModalTask.title}` : 'Notes'}
        onClose={() => setNotesModalTask(null)}
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
        open={!!requestTask}
        title={requestTask ? `Request Status • ${requestTask.title}` : 'Request Status'}
        onClose={() => setRequestTask(null)}
      >
        <div style={{display:'flex', gap:12, alignItems:'center'}}>
          <span>Current:</span>
          <span className={`status-badge status-${(requestTask?.status||'').toLowerCase().replace('_','-')}`}>{requestTask?.status?.replace('_',' ')}</span>
        </div>
        <div style={{marginTop:12, display:'flex', gap:12}}>
          <select value={requestStatus} onChange={(e)=> setRequestStatus(e.target.value)}>
            <option value="TODO">TODO</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <button className="btn-primary" onClick={submitTaskRequest}>Submit Request</button>
        </div>
      </Modal>
    </div>
  );
}

export default Tasks;

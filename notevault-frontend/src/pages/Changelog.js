import React, { useEffect, useState } from 'react';
import { changelogAPI, projectAPI, milestoneAPI, taskAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Changelog() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ workDate: new Date().toISOString().slice(0,10), title: '', description: '', repositoryUrl: '', commitHash: '', projectId: '', milestoneId: '', taskId: '' });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    const res = await projectAPI.getAll();
    setProjects(res.data);
  };

  const onProjectChange = async (pid) => {
    setForm({ ...form, projectId: pid, milestoneId: '', taskId: '' });
    if (pid) {
      const ms = await milestoneAPI.getByProject(pid);
      setMilestones(ms.data);
      setTasks([]);
    } else {
      setMilestones([]);
      setTasks([]);
    }
    setEntries([]);
  };

  const onMilestoneChange = async (mid) => {
    setForm({ ...form, milestoneId: mid, taskId: '' });
    if (mid) {
      const ts = await taskAPI.getByMilestone(mid);
      setTasks(ts.data);
    } else {
      setTasks([]);
    }
    setEntries([]);
  };

  const onTaskChange = async (tid) => {
    setForm({ ...form, taskId: tid });
  };

  const loadEntries = async () => {
    if (form.taskId) {
      const res = await changelogAPI.byTask(form.taskId);
      setEntries(res.data);
    } else if (form.milestoneId) {
      const res = await changelogAPI.byMilestone(form.milestoneId);
      setEntries(res.data);
    } else if (form.projectId) {
      const res = await changelogAPI.byProject(form.projectId);
      setEntries(res.data);
    } else {
      setEntries([]);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await changelogAPI.create({
      workDate: form.workDate,
      title: form.title,
      description: form.description,
      repositoryUrl: form.repositoryUrl,
      commitHash: form.commitHash,
      projectId: form.projectId || null,
      milestoneId: form.milestoneId || null,
      taskId: form.taskId || null,
    });
    setForm({ ...form, title: '', description: '', commitHash: '' });
    await loadEntries();
  };

  return (
    <div className="container main-content">
      <div className="page-header">
        <h1>Changelog</h1>
      </div>

      <div className="card">
        <form onSubmit={submit}>
          <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
            <input type="date" value={form.workDate} onChange={(e)=> setForm({...form, workDate: e.target.value})} required />
            <select value={form.projectId} onChange={(e)=> onProjectChange(e.target.value)}>
              <option value="">Project (optional)</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.milestoneId} onChange={(e)=> onMilestoneChange(e.target.value)} disabled={!form.projectId}>
              <option value="">Milestone (optional)</option>
              {milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <select value={form.taskId} onChange={(e)=> onTaskChange(e.target.value)} disabled={!form.milestoneId}>
              <option value="">Task (optional)</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Title" value={form.title} onChange={(e)=> setForm({...form, title: e.target.value})} required />
          <textarea placeholder="Description" value={form.description} onChange={(e)=> setForm({...form, description: e.target.value})} rows="3" />
          <input type="url" placeholder="Repository URL" value={form.repositoryUrl} onChange={(e)=> setForm({...form, repositoryUrl: e.target.value})} />
          <input type="text" placeholder="Commit hash" value={form.commitHash} onChange={(e)=> setForm({...form, commitHash: e.target.value})} />
          <button type="submit" className="btn-primary">Add Entry</button>
        </form>
      </div>

      <div className="card">
        <div className="page-header" style={{marginBottom:10}}>
          <h2>Entries</h2>
          <button className="btn-secondary" onClick={loadEntries}>Refresh</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Scope</th>
              <th>Commit</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={4}>No entries yet.</td></tr>
            ) : entries.map(e => (
              <tr key={e.id}>
                <td>{new Date(e.workDate).toLocaleDateString()}</td>
                <td>
                  <div><strong>{e.title}</strong></div>
                  <div style={{fontSize:12, color:'#7f8c8d'}}>{e.description}</div>
                </td>
                <td>
                  {e.project ? `Project: ${e.project.name}` : ''}
                  {e.milestone ? ` / Milestone: ${e.milestone.name}` : ''}
                  {e.task ? ` / Task: ${e.task.title}` : ''}
                </td>
                <td>
                  {e.commitHash ? <a href={e.repositoryUrl || '#'} target="_blank" rel="noreferrer">{e.commitHash.slice(0,7)}</a> : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Changelog;



import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, projectAPI, taskAPI } from '../services/api';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import './Dashboard.css';

ChartJS.register(Title, Tooltip, Legend, ArcElement);

function Dashboard() {
  const { user, isAdmin, isTeamLead, isEmployee } = useAuth();
  const [stats, setStats] = useState({});
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const statsResponse = await dashboardAPI.getStats();
      setStats(statsResponse.data);

      if (isEmployee()) {
        const tasksResponse = await taskAPI.getMy();
        setTasks(tasksResponse.data);
      } else {
        const projectsResponse = await projectAPI.getAll();
        setProjects(projectsResponse.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container main-content">Loading dashboard...</div>;
  }

  // Fallback: compute from tasks if stats missing or zero-only
  const computedCounts = tasks && tasks.length > 0 ? tasks.reduce((acc, t) => {
    const s = (t.status || 'TODO');
    if (s === 'COMPLETED') acc.completed += 1;
    else if (s === 'IN_PROGRESS') acc.inProgress += 1;
    else acc.todo += 1;
    return acc;
  }, { todo: 0, inProgress: 0, completed: 0 }) : { todo: 0, inProgress: 0, completed: 0 };

  const dataTodo = stats.todoTasks ?? computedCounts.todo;
  const dataInProg = stats.inProgressTasks ?? computedCounts.inProgress;
  const dataDone = stats.completedTasks ?? computedCounts.completed;

  const allZero = [dataTodo, dataInProg, dataDone].every(v => (v || 0) === 0);

  const taskStatusData = isEmployee() && !allZero ? {
    labels: ['TODO', 'In Progress', 'Completed'],
    datasets: [{
      data: [dataTodo, dataInProg, dataDone],
      backgroundColor: ['#60a5fa', '#fbbf24', '#22c55e'],
      borderColor: ['rgba(96,165,250,0.2)', 'rgba(251,191,36,0.2)', 'rgba(34,197,94,0.2)'],
      borderWidth: 2,
    }]
  } : null;

  return (
    <div className="container main-content">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.fullName}!</p>

      <div className="stats-grid">
        {isAdmin() && (
          <>
            <div className="stat-card">
              <h3>{stats.totalProjects}</h3>
              <p>Total Projects</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalMilestones}</h3>
              <p>Total Milestones</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalTasks}</h3>
              <p>Total Tasks</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
            </div>
          </>
        )}

        {isTeamLead() && (
          <>
            <div className="stat-card">
              <h3>{stats.totalProjects}</h3>
              <p>My Projects</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalMilestones}</h3>
              <p>Milestones</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalTasks}</h3>
              <p>Tasks</p>
            </div>
            <div className="stat-card">
              <h3>{stats.totalEmployees}</h3>
              <p>Team Members</p>
            </div>
          </>
        )}

        {isEmployee() && (
          <>
            <div className="stat-card">
              <h3>{stats.totalTasks}</h3>
              <p>Total Tasks</p>
            </div>
            <div className="stat-card">
              <h3>{stats.todoTasks}</h3>
              <p>TODO</p>
            </div>
            <div className="stat-card">
              <h3>{stats.inProgressTasks}</h3>
              <p>In Progress</p>
            </div>
            <div className="stat-card">
              <h3>{stats.completedTasks}</h3>
              <p>Completed</p>
            </div>
          </>
        )}
      </div>

      {isEmployee() && taskStatusData && (
        <div className="chart-container">
          <div className="card">
            <h2>My Task Distribution</h2>
            <div style={{ maxWidth: '420px', margin: '0 auto' }}>
              <Doughnut
                data={taskStatusData}
                options={{
                  plugins: { legend: { labels: { color: '#cbd5e1' } } },
                  maintainAspectRatio: false,
                  cutout: '60%'
                }}
                height={260}
              />
            </div>
          </div>
        </div>
      )}

      {!isEmployee() && projects.length > 0 && (
        <div className="card">
          <h2>Recent Projects</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.slice(0, 5).map(project => (
                <tr key={project.id}>
                  <td>{project.name}</td>
                  <td>{project.description || '-'}</td>
                  <td>
                    <span className={`status-badge status-${project.status.toLowerCase()}`}>
                      {project.status}
                    </span>
                  </td>
                  <td>{new Date(project.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isEmployee() && tasks.length > 0 && (
        <div className="card">
          <h2>My Recent Tasks</h2>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {tasks.slice(0, 5).map(task => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>
                    <span className={`status-badge status-${task.status.toLowerCase().replace('_', '-')}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{new Date(task.deadline).toLocaleDateString()}</td>
                  <td>P{task.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

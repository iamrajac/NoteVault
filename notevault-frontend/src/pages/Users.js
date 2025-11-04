import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import './Pages.css';

function Users() {
  const { isAdmin, isTeamLead } = useAuth();
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', fullName: ''
  });
  const [userType, setUserType] = useState('employee');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = isAdmin() ? await userAPI.getAllUsers() : await userAPI.getMyEmployees();
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (userType === 'teamlead' && isAdmin()) {
        await userAPI.createTeamLead(formData);
      } else {
        await userAPI.createEmployee(formData);
      }
      setFormData({ username: '', email: '', password: '', fullName: '' });
      setShowForm(false);
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        if (isAdmin()) {
          await userAPI.deleteUser(id);
        } else {
          await userAPI.deleteEmployeeAsTeamLead(id);
        }
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
      }
    }
  };

  return (
    <div className="container main-content">
      <div className="page-header">
        <h1>Users</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2>Create New User</h2>
          <form onSubmit={handleSubmit}>
            {isAdmin() && (
              <div className="form-group">
                <label>User Type</label>
                <select
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                >
                  <option value="employee">Employee</option>
                  <option value="teamlead">Team Lead</option>
                </select>
              </div>
            )}
            <input
              type="text"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              required
            />
            <button type="submit" className="btn-primary">Create User</button>
          </form>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              {isAdmin() && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`status-badge ${user.role === 'ADMIN' ? 'status-completed' : user.role === 'TEAM_LEAD' ? 'status-in-progress' : 'status-todo'}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.active ? 'status-active' : 'status-cancelled'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
              {(isAdmin() || isTeamLead()) && (
                  <td>
                    <button className="btn-danger" onClick={() => handleDelete(user.id)}>Delete</button>
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

export default Users;

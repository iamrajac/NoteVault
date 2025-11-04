import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout, isAdmin, isTeamLead } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/dashboard" className="navbar-brand">
          NoteVault
        </Link>
        
        <div className="navbar-menu">
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/projects" className="nav-link">Projects</Link>
          <Link to="/milestones" className="nav-link">Milestones</Link>
          <Link to="/tasks" className="nav-link">Tasks</Link>
          <Link to="/changelog" className="nav-link">Changelog</Link>
          {(isAdmin() || isTeamLead()) && (
            <>
              <Link to="/users" className="nav-link">Users</Link>
              <Link to="/requests" className="nav-link">Requests</Link>
            </>
          )}
        </div>

        <div className="navbar-user">
          <span className="user-info">
            {user?.fullName} ({user?.role})
          </span>
          <Link to="/profile" className="nav-link">Profile</Link>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

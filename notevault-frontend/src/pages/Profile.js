import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Pages.css';
import { userAPI } from '../services/api';
import Toast from '../components/Toast';

function Profile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const saveProfile = (e) => {
    e.preventDefault();
    alert('Profile save coming soon');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      setToast({ message: 'New passwords do not match', type: 'error' });
      return;
    }
    try {
      await userAPI.changePassword({ currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      setToast({ message: 'Password updated', type: 'success' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password';
      setToast({ message: msg, type: 'error' });
    }
  };

  return (
    <div className="container main-content">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message:'', type:'info' })} />
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      <div className="card">
        <h2>Account</h2>
        <form onSubmit={saveProfile}>
          <input type="text" value={user?.username} disabled />
          <input type="email" value={user?.email || ''} disabled placeholder="Email" />
          <input type="text" value={fullName} onChange={(e)=> setFullName(e.target.value)} placeholder="Full Name" />
          <button type="submit" className="btn-primary">Save</button>
        </form>
      </div>

      <div className="card">
        <h2>Change Password</h2>
        <form onSubmit={changePassword}>
          <input type="password" placeholder="Current password" value={passwords.current} onChange={(e)=> setPasswords({...passwords, current:e.target.value})} />
          <input type="password" placeholder="New password" value={passwords.next} onChange={(e)=> setPasswords({...passwords, next:e.target.value})} />
          <input type="password" placeholder="Confirm new password" value={passwords.confirm} onChange={(e)=> setPasswords({...passwords, confirm:e.target.value})} />
          <button type="submit" className="btn-secondary">Change Password</button>
        </form>
      </div>
    </div>
  );
}

export default Profile;



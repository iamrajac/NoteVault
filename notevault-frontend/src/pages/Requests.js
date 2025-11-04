import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { statusRequestAPI } from '../services/api';

function Requests() {
  const { isTeamLead, isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await statusRequestAPI.listForTeamLead();
      setRequests(res.data);
    } catch (e) {
      console.error('Error loading requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    await statusRequestAPI.approve(id);
    load();
  };
  const reject = async (id) => {
    await statusRequestAPI.reject(id);
    load();
  };

  if (!(isTeamLead() || isAdmin())) {
    return <div className="container main-content">Unauthorized</div>;
  }

  return (
    <div className="container main-content">
      <div className="page-header">
        <h1>Pending Status Requests</h1>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Target ID</th>
              <th>Requested Status</th>
              <th>Requester</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}>Loading...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={5}>No pending requests</td></tr>
            ) : requests.map(r => (
              <tr key={r.id}>
                <td>{r.targetType}</td>
                <td>{r.targetId}</td>
                <td>{r.requestedStatus}</td>
                <td>{r.requesterName}</td>
                <td>
                  <button className="btn-primary" onClick={() => approve(r.id)}>Approve</button>{' '}
                  <button className="btn-danger" onClick={() => reject(r.id)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Requests;



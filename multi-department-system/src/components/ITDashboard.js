import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const ITDashboard = ({ user, onLogout }) => {
  const [issues, setIssues] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newIssue, setNewIssue] = useState({ title: '', description: '', category: 'hardware', priority: 'medium' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [stats, setStats] = useState({ assigned: 0, working: 0, resolved: 0, myPending: 0 });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const assignedIssuesResponse = await ApiService.get('/issues/department/IT');
      setIssues(assignedIssuesResponse || []);
      const myIssuesResponse = await ApiService.get(`/issues/user/${user.name}`);
      setMyIssues(myIssuesResponse || []);
      const assignedIssues = assignedIssuesResponse || [];
      const myCreatedIssues = myIssuesResponse || [];
      setStats({
        assigned: assignedIssues.filter(i => i.status === 'routed').length,
        working: assignedIssues.filter(i => i.status === 'working').length,
        resolved: assignedIssues.filter(i => i.status === 'resolved').length,
        myPending: myCreatedIssues.filter(i => i.status === 'pending').length
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    try {
      const issueData = { ...newIssue, reportedByDepartment: user.department };
      await ApiService.post('/issues', issueData);
      setNewIssue({ title: '', description: '', category: 'hardware', priority: 'medium' });
      setShowCreateForm(false);
      fetchData();
    } catch (error) {
      console.error('Error creating issue:', error);
      setError('Failed to create issue');
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await ApiService.put(`/issues/${issueId}`, { status: newStatus });
      fetchData();
      setError('');
    } catch (error) {
      console.error('Error updating issue status:', error);
      setError('Failed to update issue status');
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'pending': return 'badge-status-pending';
      case 'routed': return 'badge-status-routed';
      case 'working': return 'badge-status-working';
      case 'resolved': return 'badge-status-resolved';
      case 'closed': return 'badge-status-closed';
      default: return 'badge-status-closed';
    }
  };
  const priorityClass = (priority) => {
    switch (priority) {
      case 'low': return 'badge-priority-low';
      case 'medium': return 'badge-priority-medium';
      case 'high': return 'badge-priority-high';
      case 'urgent': return 'badge-priority-urgent';
      default: return 'badge-priority-medium';
    }
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading IT Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="header-bar">
        <div className="header-content">
          <div>
            <h1 className="brand-title">IT Dashboard</h1>
            <p className="brand-subtitle">Welcome back, {user.name}</p>
          </div>
          <button onClick={onLogout} className="btn-danger">Logout</button>
        </div>
      </header>

      <div className="container-shell py-8">
        {error && (<div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>)}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--routed">A</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Assigned to Me</dt><dd className="metric-value">{stats.assigned}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--working">W</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Working On</dt><dd className="metric-value">{stats.working}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--resolved">R</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Resolved</dt><dd className="metric-value">{stats.resolved}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--pending">P</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">My Pending</dt><dd className="metric-value">{stats.myPending}</dd></dl></div></div></div>
        </div>

        {/* Create Issue */}
        <div className="mb-6">
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary">{showCreateForm ? 'Cancel' : 'Report New Issue to HR'}</button>
        </div>

        {showCreateForm && (
          <div className="surface-card p-6 mb-8">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Report New Issue</h3>
            <form onSubmit={handleCreateIssue}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Issue Title</label>
                  <input type="text" value={newIssue.title} onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Category</label>
                  <select value={newIssue.category} onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })} className="select-field">
                    <option value="hardware">Hardware</option>
                    <option value="software">Software</option>
                    <option value="network">Network</option>
                    <option value="salary">Salary</option>
                    <option value="benefits">Benefits</option>
                    <option value="policy">Policy</option>
                    <option value="training">Training</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-2">Priority</label>
                <select value={newIssue.priority} onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })} className="select-field">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-secondary-700 mb-2">Description</label>
                <textarea value={newIssue.description} onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })} rows={4} className="textarea-field" required />
              </div>
              <button type="submit" className="btn-primary">Submit Issue</button>
            </form>
          </div>
        )}

        {/* Issues Assigned to IT */}
        <div className="surface-card mb-8">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">Issues Assigned to IT Department</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-header">Issue</th>
                  <th className="table-header">Reported By</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {issues.map((issue) => (
                  <tr key={issue._id} className="table-row">
                    <td className="table-cell"><div><div className="text-sm font-medium text-secondary-900">{issue.title}</div><div className="text-sm text-secondary-600">{issue.description}</div></div></td>
                    <td className="table-cell"><div className="text-sm text-secondary-900">{issue.reportedBy}</div><div className="text-sm text-secondary-600">{issue.reportedByDepartment}</div></td>
                    <td className="table-cell"><span className="badge bg-secondary-100 text-secondary-800">{issue.category}</span></td>
                    <td className="table-cell"><span className={`badge ${priorityClass(issue.priority)}`}>{issue.priority}</span></td>
                    <td className="table-cell"><span className={`badge ${statusClass(issue.status)}`}>{issue.status}</span></td>
                    <td className="table-cell text-sm font-medium">
                      <div className="flex flex-col space-y-1">
                        {issue.status === 'routed' && (<button onClick={() => updateIssueStatus(issue._id, 'working')} className="btn-ghost">Start Working</button>)}
                        {issue.status === 'working' && (<button onClick={() => updateIssueStatus(issue._id, 'resolved')} className="btn-ghost text-green-600 hover:text-green-700">Mark Resolved</button>)}
                        {issue.status === 'resolved' && (<button onClick={() => updateIssueStatus(issue._id, 'working')} className="btn-ghost text-yellow-600 hover:text-yellow-700">Reopen</button>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length === 0 && (<div className="text-center py-8 text-secondary-500">No issues assigned to IT department yet.</div>)}
          </div>
        </div>

        {/* My Reported Issues */}
        <div className="surface-card">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">My Reported Issues</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-header">Issue</th>
                  <th className="table-header">Category</th>
                  <th className="table-header">Priority</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Routed To</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {myIssues.filter(i => i && i.status && i._id).map((issue) => (
                  <tr key={issue._id} className="table-row">
                    <td className="table-cell"><div><div className="text-sm font-medium text-secondary-900">{issue.title || 'No title'}</div><div className="text-sm text-secondary-600">{issue.description || 'No description'}</div></div></td>
                    <td className="table-cell"><span className="badge bg-secondary-100 text-secondary-800">{issue.category || 'other'}</span></td>
                    <td className="table-cell"><span className={`badge ${priorityClass(issue.priority)}`}>{issue.priority || 'medium'}</span></td>
                    <td className="table-cell"><span className={`badge ${statusClass(issue.status)}`}>{issue.status || 'pending'}</span></td>
                    <td className="table-cell text-sm text-secondary-900">{issue.routedToDepartment || 'Not routed yet'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {myIssues.length === 0 && (<div className="text-center py-8 text-secondary-500">You haven't reported any issues yet.</div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ITDashboard;

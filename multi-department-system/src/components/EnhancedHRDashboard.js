import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const EnhancedHRDashboard = ({ user, onLogout }) => {
  const [issues, setIssues] = useState([]);
  const [routingSuggestions, setRoutingSuggestions] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issues');
  const [showAutoRouteModal, setShowAutoRouteModal] = useState(false);
  const [autoRouting, setAutoRouting] = useState(false);
  
  // Team management states
  const [teamMembers, setTeamMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('Tech');
  
  // Expense management states
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(), 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'teams') {
      loadTeamData();
    } else if (activeTab === 'expenses') {
      loadExpenseData();
    }
  }, [selectedDepartment, activeTab]);

  const loadData = async () => {
    try {
      try { await ApiService.get('/test-hr'); } catch (e) { setNotification(`Auth or connection issue: ${e.message}`); }
      const issuesResponse = await ApiService.getAllIssues();
      setIssues(issuesResponse || []);
      try { setRoutingSuggestions(await ApiService.get('/issues/routing-suggestions') || []); } catch { setRoutingSuggestions([]); }
      if (activeTab === 'teams') await loadTeamData();
      if (activeTab === 'expenses') await loadExpenseData();
    } catch (error) {
      console.error('Failed to load HR dashboard data:', error);
      setNotification(`Failed to load data: ${error.message}`);
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamData = async () => {
    try {
      const [teamResponse, usersResponse] = await Promise.all([
        ApiService.getMyTeam(),
        ApiService.getUnassignedUsers(selectedDepartment)
      ]);
      const currentTeamMembers = selectedDepartment === 'Tech' ? (teamResponse.techMembers || []) : selectedDepartment === 'IT' ? (teamResponse.itMembers || []) : (teamResponse.financeMembers || []);
      const allDepartmentUsers = usersResponse || [];
      const teamMemberIds = new Set(currentTeamMembers.map(m => m._id));
      const availableUsersFiltered = allDepartmentUsers.filter(u => !teamMemberIds.has(u._id));
      setTeamMembers(currentTeamMembers);
      setAvailableUsers(availableUsersFiltered);
    } catch (error) {
      console.error('Failed to load team data:', error);
      setNotification('Failed to load team data');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const loadExpenseData = async () => {
    try {
      const [pendingResponse, allResponse] = await Promise.all([
        ApiService.get('/expenses/pending'),
        ApiService.get('/expenses')
      ]);
      setPendingExpenses(pendingResponse || []);
      setAllExpenses(allResponse || []);
    } catch (error) {
      console.error('Failed to load expense data:', error);
      setNotification('Failed to load expense data');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleExpenseApproval = async (expenseId, status, hrNotes = '') => {
    try {
      await ApiService.put(`/expenses/${expenseId}/approve`, { status, hrNotes });
      await loadExpenseData();
      setNotification(`Expense ${status} successfully`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Failed to update expense:', error);
      setNotification('Failed to update expense status');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleStatusUpdate = async (issueId, newStatus) => {
    try {
      await ApiService.put(`/issues/${issueId}`, { status: newStatus });
      loadData();
      setNotification(`Issue status updated to ${newStatus}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Failed to update issue:', error);
      setNotification('Failed to update issue status');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleManualRoute = async (issueId, department, userId, userName) => {
    try {
      await ApiService.put(`/issues/${issueId}`, { status: 'routed', routedToDepartment: department, assignedToDepartmentUser: userId, assignedToDepartmentUserName: userName, hrNotes: `Manually routed to ${department} department` });
      loadData();
      setNotification(`Issue routed to ${department} department`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Failed to route issue:', error);
      setNotification('Failed to route issue');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleAutoRoute = async () => {
    try {
      setAutoRouting(true);
      const response = await ApiService.post('/issues/auto-route');
      loadData();
      setNotification(`Successfully auto-routed ${response.routedCount} issues`);
      setShowAutoRouteModal(false);
      setTimeout(() => setNotification(null), 5000);
    } catch (error) {
      console.error('Failed to auto-route issues:', error);
      setNotification('Failed to auto-route issues');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setAutoRouting(false);
    }
  };

  const handleAddTeamMember = async (userId) => {
    try {
      await ApiService.addTeamMemberDept(userId, selectedDepartment);
      await loadTeamData();
      setNotification('Team member added successfully');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Failed to add team member:', error);
      setNotification(`Failed to add team member: ${error.message || 'Unknown error'}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRemoveTeamMember = async (userId) => {
    try {
      await ApiService.removeTeamMemberDept(userId, selectedDepartment);
      await loadTeamData();
      setNotification('Team member removed successfully');
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Failed to remove team member:', error);
      setNotification(`Failed to remove team member: ${error.message || 'Unknown error'}`);
      setTimeout(() => setNotification(null), 3000);
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
  const expenseStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'badge-status-pending';
      case 'approved': return 'badge-status-resolved';
      case 'rejected': return 'badge-status-closed';
      default: return 'badge-status-closed';
    }
  };

  const pendingIssues = issues.filter(issue => issue.status === 'pending');
  const routedIssues = issues.filter(issue => issue.status === 'routed');
  const workingIssues = issues.filter(issue => issue.status === 'working');
  const resolvedIssues = issues.filter(issue => issue.status === 'resolved');

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-secondary-600">Loading HR Dashboard...</p>
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
            <h1 className="brand-title">HR Dashboard</h1>
            <p className="brand-subtitle">Welcome back, {user.name}</p>
          </div>
          <button onClick={onLogout} className="btn-danger">Logout</button>
        </div>
      </header>

      <div className="container-shell py-8">
        {notification && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">{notification}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--pending">P</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Pending Issues</dt><dd className="metric-value">{pendingIssues.length}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--routed">R</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Routed</dt><dd className="metric-value">{routedIssues.length}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--working">W</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Working</dt><dd className="metric-value">{workingIssues.length}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--resolved">✓</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Resolved</dt><dd className="metric-value">{resolvedIssues.length}</dd></dl></div></div></div>
        </div>

        {/* Tabs */}
        <div className="tab-nav mb-6">
          <nav className="tab-list">
            <button onClick={() => setActiveTab('issues')} className={`tab-btn ${activeTab === 'issues' ? 'tab-btn--active' : ''}`}>Issues Management</button>
            <button onClick={() => setActiveTab('teams')} className={`tab-btn ${activeTab === 'teams' ? 'tab-btn--active' : ''}`}>Team Management</button>
            <button onClick={() => setActiveTab('expenses')} className={`tab-btn ${activeTab === 'expenses' ? 'tab-btn--active' : ''}`}>Budget Expenses</button>
          </nav>
        </div>

        {/* Auto-Route Button */}
        {activeTab === 'issues' && pendingIssues.length > 0 && (
          <div className="mb-6">
            <button onClick={() => setShowAutoRouteModal(true)} className="btn-primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Auto-Route {pendingIssues.length} Pending Issues
            </button>
          </div>
        )}

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <div className="surface-card">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h3 className="text-lg font-semibold text-secondary-900">All Issues</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-head">
                  <tr>
                    <th className="table-header">Issue Details</th>
                    <th className="table-header">Reporter</th>
                    <th className="table-header">Category & Priority</th>
                    <th className="table-header">Status & Routing</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-secondary-200">
                  {issues.map((issue) => (
                    <tr key={issue._id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-secondary-900">{issue.title}</div>
                          <div className="text-sm text-secondary-600">{issue.description}</div>
                          {issue.autoRouted && (<div className="text-xs text-primary-600 mt-1">🤖 Auto-routed</div>)}
                        </div>
                      </td>
                      <td className="table-cell"><div className="text-sm text-secondary-900">{issue.reportedBy}</div><div className="text-sm text-secondary-600">{issue.reportedByDepartment}</div></td>
                      <td className="table-cell"><div className="flex flex-col gap-1"><span className="badge bg-secondary-100 text-secondary-800">{issue.category}</span><span className={`badge ${priorityClass(issue.priority)}`}>{issue.priority}</span></div></td>
                      <td className="table-cell"><div className="flex flex-col gap-1"><span className={`badge ${statusClass(issue.status)}`}>{issue.status}</span>{issue.routedToDepartment && (<div className="text-xs text-secondary-600">→ {issue.routedToDepartment}{issue.assignedToDepartmentUserName && (<div>({issue.assignedToDepartmentUserName})</div>)}</div>)}</div></td>
                      <td className="table-cell text-sm font-medium">
                        {issue.status === 'pending' && (
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleManualRoute(issue._id, 'IT', null, null)} className="btn-ghost">Route to IT</button>
                            <button onClick={() => handleManualRoute(issue._id, 'Finance', null, null)} className="btn-ghost text-green-600 hover:text-green-700">Route to Finance</button>
                            <button onClick={() => handleManualRoute(issue._id, 'Tech', null, null)} className="btn-ghost text-purple-600 hover:text-purple-700">Route to Tech</button>
                          </div>
                        )}
                        {issue.status === 'resolved' && (<button onClick={() => handleStatusUpdate(issue._id, 'closed')} className="btn-ghost">Close Issue</button>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {issues.length === 0 && (<div className="text-center py-8 text-secondary-500">No issues found.</div>)}
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="surface-card">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">Select Department</h3>
              <div className="flex gap-3">
                {['Tech', 'IT', 'Finance'].map((dept) => (
                  <button key={dept} onClick={() => setSelectedDepartment(dept)} className={`btn ${selectedDepartment === dept ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-secondary-200 text-secondary-700 hover:bg-secondary-300'} px-4 py-2 rounded-md font-medium`}>
                    {dept} Department
                  </button>
                ))}
              </div>
            </div>

            <div className="surface-card">
              <div className="px-6 py-4 border-b border-secondary-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-secondary-900">{selectedDepartment} Team Members</h3>
                <button onClick={() => setShowAddMemberModal(true)} className="btn-primary text-sm">Add Member</button>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-header">Name</th>
                      <th className="table-header">Email</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {teamMembers.map((member) => (
                      <tr key={member._id} className="table-row">
                        <td className="table-cell text-sm font-medium text-secondary-900">{member.name}</td>
                        <td className="table-cell text-sm text-secondary-600">{member.email}</td>
                        <td className="table-cell text-sm font-medium"><button onClick={() => handleRemoveTeamMember(member._id)} className="btn-ghost text-red-600 hover:text-red-700">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {teamMembers.length === 0 && (<div className="text-center py-8 text-secondary-500">No team members assigned yet.</div>)}
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <h3 className="text-lg font-bold text-secondary-900 mb-4">Add Team Member</h3>
              <div className="space-y-4">
                {availableUsers.map((u) => (
                  <div key={u._id} className="flex justify-between items-center p-3 border rounded">
                    <div><div className="font-medium">{u.name}</div><div className="text-sm text-secondary-600">{u.email}</div></div>
                    <button onClick={() => { handleAddTeamMember(u._id); setShowAddMemberModal(false); }} className="btn-primary text-sm">Add</button>
                  </div>
                ))}
                {availableUsers.length === 0 && (<div className="text-center py-4 text-secondary-500">No available users to add.</div>)}
              </div>
              <div className="flex justify-end gap-3 mt-6"><button onClick={() => setShowAddMemberModal(false)} className="btn-secondary">Cancel</button></div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--pending">P</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Pending Approval</dt><dd className="metric-value">{pendingExpenses.length}</dd></dl></div></div></div>
              <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--resolved">✓</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Approved</dt><dd className="metric-value">{allExpenses.filter(e => e.status === 'approved').length}</dd></dl></div></div></div>
              <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon bg-red-500">✗</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Rejected</dt><dd className="metric-value">{allExpenses.filter(e => e.status === 'rejected').length}</dd></dl></div></div></div>
            </div>

            <div className="surface-card">
              <div className="px-6 py-4 border-b border-secondary-200">
                <h3 className="text-lg font-semibold text-secondary-900">Pending Budget Expenses</h3>
                <p className="text-sm text-secondary-600">Review and approve/reject expense requests from departments</p>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-header">Description</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Category</th>
                      <th className="table-header">Department</th>
                      <th className="table-header">Submitted By</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {pendingExpenses.map((expense) => (
                      <tr key={expense._id} className="table-row">
                        <td className="table-cell"><div className="text-sm font-medium text-secondary-900">{expense.description}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">${expense.amount?.toFixed(2)}</div></td>
                        <td className="table-cell"><span className="badge bg-secondary-100 text-secondary-800">{expense.category}</span></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">{expense.createdByDepartment}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">{expense.createdBy}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">{new Date(expense.date).toLocaleDateString()}</div></td>
                        <td className="table-cell text-sm font-medium">
                          <div className="flex gap-2">
                            <button onClick={() => handleExpenseApproval(expense._id, 'approved')} className="btn-ghost text-green-600 hover:text-green-700">Approve</button>
                            <button onClick={() => { const notes = prompt('Enter rejection notes (optional):'); handleExpenseApproval(expense._id, 'rejected', notes || ''); }} className="btn-ghost text-red-600 hover:text-red-700">Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingExpenses.length === 0 && (<div className="text-center py-8 text-secondary-500">No pending expenses to review.</div>)}
              </div>
            </div>

            <div className="surface-card">
              <div className="px-6 py-4 border-b border-secondary-200">
                <h3 className="text-lg font-semibold text-secondary-900">All Budget Expenses</h3>
                <p className="text-sm text-secondary-600">Complete history of all expense requests</p>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-header">Description</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Department</th>
                      <th className="table-header">Submitted By</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">Approved By</th>
                      <th className="table-header">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {allExpenses.map((expense) => (
                      <tr key={expense._id} className="table-row">
                        <td className="table-cell"><div className="text-sm font-medium text-secondary-900">{expense.description}</div><div className="text-sm text-secondary-600">{expense.category}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">${expense.amount?.toFixed(2)}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">{expense.createdByDepartment}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">{expense.createdBy}</div></td>
                        <td className="table-cell"><span className={`badge ${expenseStatusClass(expense.status)}`}>{expense.status}</span></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">{expense.approvedBy || '-'}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-600">{expense.hrNotes || '-'}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allExpenses.length === 0 && (<div className="text-center py-8 text-secondary-500">No expenses found.</div>)}
              </div>
            </div>
          </div>
        )}

        {/* Auto-Route Modal */}
        {showAutoRouteModal && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <h3 className="text-lg font-bold text-secondary-900 mb-4">Auto-Route Issues</h3>
              <p className="text-sm text-secondary-600 mb-4">This will automatically route {pendingIssues.length} pending issues to appropriate departments based on their categories:</p>
              <ul className="text-sm text-secondary-600 mb-6 space-y-1">
                <li>• Hardware/Software/Network → IT Department</li>
                <li>• Salary/Benefits → Finance Department</li>
                <li>• Policy/Training → HR Department</li>
                <li>• Other → Tech Department</li>
              </ul>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAutoRouteModal(false)} className="btn-secondary" disabled={autoRouting}>Cancel</button>
                <button onClick={handleAutoRoute} disabled={autoRouting} className="btn-primary disabled:bg-secondary-400">{autoRouting ? 'Routing...' : 'Auto-Route Issues'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedHRDashboard;

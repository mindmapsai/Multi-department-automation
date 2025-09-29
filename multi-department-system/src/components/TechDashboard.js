import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const TechDashboard = ({ user, onLogout }) => {
  const [reportedIssues, setReportedIssues] = useState([]);
  const [showNewIssueForm, setShowNewIssueForm] = useState(false);
  const [newIssue, setNewIssue] = useState({ 
    title: '', 
    description: '', 
    category: 'hardware', 
    priority: 'medium' 
  });
  const [assignedHR, setAssignedHR] = useState(null);
  const [departmentIssues, setDepartmentIssues] = useState([]);
  
  // Expense management states
  const [expenses, setExpenses] = useState([]);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'hardware',
    date: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState('issues');

  useEffect(() => {
    loadReportedIssues();
    loadAssignedHR();
    loadDepartmentIssues();
    loadExpenses();
    const interval = setInterval(() => {
      loadReportedIssues();
      loadAssignedHR();
      loadDepartmentIssues();
      loadExpenses();
    }, 5000);
    return () => clearInterval(interval);
  }, [user.name]);

  const loadReportedIssues = async () => {
    try {
      const issuesData = await ApiService.getUserIssues(user.name);
      setReportedIssues(issuesData || []);
    } catch (error) {
      console.error('Failed to load reported issues:', error);
      setReportedIssues([]);
    }
  };

  const loadAssignedHR = async () => {
    try {
      const hrData = await ApiService.getMyHR();
      setAssignedHR(hrData.assignedHR || null);
    } catch (error) {
      console.error('Failed to load assigned HR:', error);
      setAssignedHR(null);
    }
  };

  const loadDepartmentIssues = async () => {
    try {
      const deptIssues = await ApiService.get('/issues/department/Tech');
      setDepartmentIssues(deptIssues || []);
    } catch (error) {
      console.error('Failed to load department issues:', error);
      setDepartmentIssues([]);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await ApiService.put(`/issues/${issueId}`, { status: newStatus });
      loadDepartmentIssues();
      loadReportedIssues();
    } catch (error) {
      console.error('Error updating issue status:', error);
      alert('Failed to update issue status. Please try again.');
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    try {
      const issueData = { ...newIssue, reportedByDepartment: user.department };
      const createdIssue = await ApiService.post('/issues', issueData);
      setReportedIssues(prev => [createdIssue, ...prev]);
      setNewIssue({ title: '', description: '', category: 'hardware', priority: 'medium' });
      setShowNewIssueForm(false);
    } catch (error) {
      console.error('Failed to create issue:', error);
      alert('Failed to create issue. Please try again.');
    }
  };

  // Expense management
  const loadExpenses = async () => {
    try {
      const expensesData = await ApiService.get('/expenses');
      setExpenses(expensesData || []);
    } catch (error) {
      console.error('Failed to load expenses:', error);
      setExpenses([]);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const expenseData = { ...newExpense, amount: parseFloat(newExpense.amount) };
      await ApiService.post('/expenses', expenseData);
      setNewExpense({ description: '', amount: '', category: 'hardware', date: new Date().toISOString().split('T')[0] });
      setShowExpenseForm(false);
      loadExpenses();
      alert('Expense submitted successfully and sent to HR for approval!');
    } catch (error) {
      console.error('Failed to create expense:', error);
      alert('Failed to submit expense. Please try again.');
    }
  };

  // Design-system badge helpers
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

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="header-bar">
        <div className="header-content">
          <div>
            <h1 className="brand-title">Tech Dashboard</h1>
            <p className="brand-subtitle">Welcome, {user.name}</p>
          </div>
          <button onClick={onLogout} className="btn-danger">Logout</button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-shell py-8">
        {/* HR Assignment */}
        <section className="surface-section">
          <h3 className="text-lg leading-6 font-semibold text-secondary-900 mb-4">Your HR Assignment</h3>
          {assignedHR ? (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-medium text-sm">HR</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-900">{assignedHR.name}</p>
                <p className="text-sm text-secondary-500">{assignedHR.email}</p>
                <span className="chip chip-hr">✅ Your issues will be sent to this HR representative</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <span className="text-yellow-600 font-medium text-sm">⚠️</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-900">No HR Assigned</p>
                <p className="text-sm text-secondary-500">Your issues will be visible to all HR representatives</p>
                <span className="chip chip-warning">Waiting for HR team assignment</span>
              </div>
            </div>
          )}
        </section>

        {/* Tabs */}
        <div className="tab-nav mb-6">
          <nav className="tab-list">
            <button onClick={() => setActiveTab('issues')} className={`tab-btn ${activeTab === 'issues' ? 'tab-btn--active' : ''}`}>Issues</button>
            <button onClick={() => setActiveTab('expenses')} className={`tab-btn ${activeTab === 'expenses' ? 'tab-btn--active' : ''}`}>Budget Expenses</button>
          </nav>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          {activeTab === 'issues' && (
            <button onClick={() => setShowNewIssueForm(true)} className="btn-primary">Report Issue to HR</button>
          )}
          {activeTab === 'expenses' && (
            <button onClick={() => setShowExpenseForm(true)} className="btn-success">Submit Budget Expense</button>
          )}
        </div>

        {/* Issues Tab */}
        {activeTab === 'issues' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="metric-card p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="metric-icon metric-icon--pending">P</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="metric-label">Pending Issues</dt>
                      <dd className="metric-value">{reportedIssues.filter(i => i && i.status === 'pending').length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="metric-card p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="metric-icon metric-icon--working">W</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="metric-label">Being Worked On</dt>
                      <dd className="metric-value">{reportedIssues.filter(i => i && i.status === 'working').length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="metric-card p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="metric-icon metric-icon--resolved">R</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="metric-label">Resolved</dt>
                      <dd className="metric-value">{reportedIssues.filter(i => i && i.status === 'resolved').length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* New Issue Modal */}
            {showNewIssueForm && (
              <div className="modal-overlay">
                <div className="modal-panel">
                  <h3 className="text-lg font-bold text-secondary-900 mb-4">Report Issue to HR</h3>
                  <form onSubmit={handleCreateIssue}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">Issue Title</label>
                      <input type="text" required className="input-field" value={newIssue.title} onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })} />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">Category</label>
                      <select className="select-field" value={newIssue.category} onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}>
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
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">Priority</label>
                      <select className="select-field" value={newIssue.priority} onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-secondary-700 mb-2">Description</label>
                      <textarea rows="4" className="textarea-field" required value={newIssue.description} onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}></textarea>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setShowNewIssueForm(false)} className="btn-secondary">Cancel</button>
                      <button type="submit" className="btn-primary">Report Issue</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Reported Issues */}
            <div className="surface-card">
              <div className="px-1 py-1 sm:px-1">
                <h3 className="text-lg font-semibold text-secondary-900">My Reported Issues</h3>
                <p className="mt-1 text-sm text-secondary-500">Track the status of issues you've reported to HR department.</p>
                <div className="mt-2 text-xs text-secondary-500">My reported issues: {reportedIssues.length} | Last updated: {new Date().toLocaleTimeString()}</div>
              </div>
              <ul className="divide-y divide-secondary-200">
                {reportedIssues.length === 0 ? (
                  <li className="px-4 py-6 text-center text-secondary-500">No issues reported yet. Click "Report Issue to HR" to get started.</li>
                ) : (
                  reportedIssues.filter(issue => issue && issue._id).map((issue) => (
                    <li key={issue._id} className="px-4 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-secondary-900 truncate">{issue.title || 'No title'}</p>
                            <span className={`badge ${statusClass(issue.status)}`}>{issue.status || 'pending'}</span>
                          </div>
                          <p className="mt-1 text-sm text-secondary-600">{issue.description || 'No description'}</p>
                          <p className="mt-1 text-xs text-secondary-400">Reported: {new Date(issue.createdAt).toLocaleDateString()}{issue.updatedAt && ` | Last updated: ${new Date(issue.updatedAt).toLocaleDateString()}`}</p>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Issues Assigned to Tech */}
            {departmentIssues.length > 0 && (
              <div className="surface-section">
                <div className="px-6 py-4 border-b border-secondary-200">
                  <h3 className="text-lg font-semibold text-secondary-900">Issues Assigned to Tech Department</h3>
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
                      {departmentIssues.filter(issue => issue && issue.status && issue._id).map((issue) => (
                        <tr key={issue._id} className="table-row">
                          <td className="table-cell">
                            <div>
                              <div className="text-sm font-medium text-secondary-900">{issue.title || 'No title'}</div>
                              <div className="text-sm text-secondary-600">{issue.description || 'No description'}</div>
                            </div>
                          </td>
                          <td className="table-cell">
                            <div className="text-sm text-secondary-900">{issue.reportedBy || 'Unknown'}</div>
                            <div className="text-sm text-secondary-600">{issue.reportedByDepartment || 'Unknown'}</div>
                          </td>
                          <td className="table-cell">
                            <span className="badge bg-secondary-100 text-secondary-800">{issue.category || 'other'}</span>
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${priorityClass(issue.priority)}`}>{issue.priority || 'medium'}</span>
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${statusClass(issue.status)}`}>{issue.status || 'pending'}</span>
                          </td>
                          <td className="table-cell text-sm font-medium">
                            <div className="flex flex-col space-y-1">
                              {issue.status === 'routed' && (
                                <button onClick={() => updateIssueStatus(issue._id, 'working')} className="btn-ghost">Start Working</button>
                              )}
                              {issue.status === 'working' && (
                                <button onClick={() => updateIssueStatus(issue._id, 'resolved')} className="btn-ghost text-green-600 hover:text-green-700">Mark Resolved</button>
                              )}
                              {issue.status === 'resolved' && (
                                <button onClick={() => updateIssueStatus(issue._id, 'working')} className="btn-ghost text-yellow-600 hover:text-yellow-700">Reopen</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <>
            {/* Expense Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="metric-card p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0"><div className="metric-icon metric-icon--pending">P</div></div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="metric-label">Pending Expenses</dt>
                      <dd className="metric-value">{expenses.filter(e => e && e.status === 'pending').length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="metric-card p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0"><div className="metric-icon metric-icon--resolved">A</div></div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="metric-label">Approved Expenses</dt>
                      <dd className="metric-value">{expenses.filter(e => e && e.status === 'approved').length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="metric-card p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0"><div className="metric-icon bg-red-500">R</div></div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="metric-label">Rejected Expenses</dt>
                      <dd className="metric-value">{expenses.filter(e => e && e.status === 'rejected').length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Form */}
            {showExpenseForm && (
              <div className="modal-overlay">
                <div className="modal-panel">
                  <h3 className="text-lg font-bold text-secondary-900 mb-4">Submit Budget Expense to HR</h3>
                  <form onSubmit={handleCreateExpense}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Description</label>
                        <input type="text" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} className="input-field" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Amount ($)</label>
                        <input type="number" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} className="input-field" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Category</label>
                        <select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="select-field">
                          <option value="hardware">Hardware</option>
                          <option value="software">Software</option>
                          <option value="equipment">Equipment</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="training">Training</option>
                          <option value="office-supplies">Office Supplies</option>
                          <option value="travel">Travel</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">Date</label>
                        <input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} className="input-field" required />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setShowExpenseForm(false)} className="btn-secondary">Cancel</button>
                      <button type="submit" className="btn-success">Submit Expense</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Expenses Table */}
            <div className="surface-card">
              <div className="px-6 py-4 border-b border-secondary-200">
                <h3 className="text-lg font-semibold text-secondary-900">My Budget Expenses</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead className="table-head">
                    <tr>
                      <th className="table-header">Description</th>
                      <th className="table-header">Amount</th>
                      <th className="table-header">Category</th>
                      <th className="table-header">Date</th>
                      <th className="table-header">Status</th>
                      <th className="table-header">HR Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {expenses.map((expense) => (
                      <tr key={expense._id} className="table-row">
                        <td className="table-cell"><div className="text-sm font-medium text-secondary-900">{expense.description}</div></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">${expense.amount?.toFixed(2)}</div></td>
                        <td className="table-cell"><span className="badge bg-secondary-100 text-secondary-800">{expense.category}</span></td>
                        <td className="table-cell"><div className="text-sm text-secondary-900">{new Date(expense.date).toLocaleDateString()}</div></td>
                        <td className="table-cell"><span className={`badge ${expenseStatusClass(expense.status)}`}>{expense.status}</span></td>
                        <td className="table-cell"><div className="text-sm text-secondary-600">{expense.hrNotes || '-'}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expenses.length === 0 && (
                  <div className="text-center py-8 text-secondary-500">No expenses submitted yet.</div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default TechDashboard;

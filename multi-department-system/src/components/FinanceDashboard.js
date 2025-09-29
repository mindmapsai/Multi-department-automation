import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const FinanceDashboard = ({ user, onLogout }) => {
  const [expenses, setExpenses] = useState([]);
  const [showNewExpenseForm, setShowNewExpenseForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'office-supplies', date: new Date().toISOString().split('T')[0] });
  const [departmentIssues, setDepartmentIssues] = useState([]);

  useEffect(() => {
    loadExpenses();
    loadDepartmentIssues();
    const interval = setInterval(() => loadDepartmentIssues(), 5000);
    return () => clearInterval(interval);
  }, []);

  const loadExpenses = async () => {
    try {
      const expensesData = await ApiService.getAllExpenses();
      setExpenses(expensesData);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartmentIssues = async () => {
    try {
      const deptIssues = await ApiService.get('/issues/department/Finance');
      setDepartmentIssues(deptIssues || []);
    } catch (error) {
      console.error('Failed to load department issues:', error);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await ApiService.put(`/issues/${issueId}`, { status: newStatus });
      loadDepartmentIssues();
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  };

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    try {
      const createdExpense = await ApiService.createExpense(newExpense.description, parseFloat(newExpense.amount), newExpense.category, newExpense.date, user.name);
      setExpenses(prev => [createdExpense, ...prev]);
      setNewExpense({ description: '', amount: '', category: 'office-supplies', date: new Date().toISOString().split('T')[0] });
      setShowNewExpenseForm(false);
    } catch (error) {
      console.error('Failed to create expense:', error);
      alert('Failed to create expense. Please try again.');
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

  const categoryChip = (category) => {
    return 'badge bg-secondary-100 text-secondary-800';
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="header-bar">
        <div className="header-content">
          <div>
            <h1 className="brand-title">Finance Dashboard</h1>
            <p className="brand-subtitle">Welcome, {user.name}</p>
          </div>
          <button onClick={onLogout} className="btn-danger">Logout</button>
        </div>
      </header>

      {/* Main */}
      <main className="container-shell py-8">
        <div className="mb-6">
          <button onClick={() => setShowNewExpenseForm(true)} className="btn-success">Add New Expense</button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--resolved">$</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Total Expenses</dt><dd className="metric-value">${expenses.reduce((t, e) => t + e.amount, 0).toFixed(2)}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon metric-icon--routed">M</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">This Month</dt><dd className="metric-value">${expenses.filter(e => { const d = new Date(e.date); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((t, e) => t + e.amount, 0).toFixed(2)}</dd></dl></div></div></div>
          <div className="metric-card p-5"><div className="flex items-center"><div className="flex-shrink-0"><div className="metric-icon bg-purple-500">#</div></div><div className="ml-5 w-0 flex-1"><dl><dt className="metric-label">Total Records</dt><dd className="metric-value">{expenses.length}</dd></dl></div></div></div>
        </div>

        {/* Expense Modal */}
        {showNewExpenseForm && (
          <div className="modal-overlay">
            <div className="modal-panel">
              <h3 className="text-lg font-bold text-secondary-900 mb-4">Add New Expense</h3>
              <form onSubmit={handleCreateExpense}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Description</label>
                  <input type="text" required className="input-field" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Amount ($)</label>
                  <input type="number" step="0.01" required className="input-field" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })} />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Category</label>
                  <select className="select-field" value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}>
                    <option value="office-supplies">Office Supplies</option>
                    <option value="travel">Travel</option>
                    <option value="equipment">Equipment</option>
                    <option value="software">Software</option>
                    <option value="marketing">Marketing</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Date</label>
                  <input type="date" required className="input-field" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowNewExpenseForm(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-success">Add Expense</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div className="surface-card">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h3 className="text-lg font-semibold text-secondary-900">Expense Records</h3>
            <p className="mt-1 text-sm text-secondary-600">Track and manage department expenses and financial records.</p>
          </div>
          <ul className="divide-y divide-secondary-200">
            {expenses.length === 0 ? (
              <li className="px-4 py-6 text-center text-secondary-500">No expenses recorded yet. Click "Add New Expense" to get started.</li>
            ) : (
              expenses.map((expense) => (
                <li key={expense._id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-secondary-900 truncate">{expense.description}</p>
                        <div className="ml-2 flex-shrink-0 flex items-center gap-2">
                          <span className="text-lg font-semibold text-green-600">${expense.amount.toFixed(2)}</span>
                          <span className={categoryChip(expense.category)}>{expense.category.replace('-', ' ')}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-secondary-400">Date: {new Date(expense.date).toLocaleDateString()} | Added by: {expense.createdBy} | Created: {new Date(expense.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Issues Assigned to Finance */}
        {departmentIssues.length > 0 && (
          <div className="surface-card mt-8">
            <div className="px-6 py-4 border-b border-secondary-200">
              <h3 className="text-lg font-semibold text-secondary-900">Issues Assigned to Finance Department</h3>
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
                      <td className="table-cell"><div><div className="text-sm font-medium text-secondary-900">{issue.title || 'No title'}</div><div className="text-sm text-secondary-600">{issue.description || 'No description'}</div></div></td>
                      <td className="table-cell"><div className="text-sm text-secondary-900">{issue.reportedBy || 'Unknown'}</div><div className="text-sm text-secondary-600">{issue.reportedByDepartment || 'Unknown'}</div></td>
                      <td className="table-cell"><span className="badge bg-secondary-100 text-secondary-800">{issue.category || 'other'}</span></td>
                      <td className="table-cell"><span className={`badge ${priorityClass(issue.priority)}`}>{issue.priority || 'medium'}</span></td>
                      <td className="table-cell"><span className={`badge ${statusClass(issue.status)}`}>{issue.status || 'pending'}</span></td>
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FinanceDashboard;

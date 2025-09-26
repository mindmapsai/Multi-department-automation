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
  const [loading, setLoading] = useState(true);
  const [assignedHR, setAssignedHR] = useState(null);
  const [departmentIssues, setDepartmentIssues] = useState([]);

  useEffect(() => {
    loadReportedIssues();
    loadAssignedHR();
    loadDepartmentIssues();
    
    // Set up polling to check for issue status updates every 5 seconds
    const interval = setInterval(() => {
      loadReportedIssues();
      loadAssignedHR();
      loadDepartmentIssues();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [user.name]);

  const loadReportedIssues = async () => {
    try {
      const issuesData = await ApiService.getUserIssues(user.name);
      setReportedIssues(issuesData);
    } catch (error) {
      console.error('Failed to load reported issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedHR = async () => {
    try {
      const hrData = await ApiService.getMyHR();
      setAssignedHR(hrData.assignedHR);
    } catch (error) {
      console.error('Failed to load assigned HR:', error);
    }
  };

  const loadDepartmentIssues = async () => {
    try {
      const deptIssues = await ApiService.get('/issues/department/Tech');
      setDepartmentIssues(deptIssues || []);
    } catch (error) {
      console.error('Failed to load department issues:', error);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await ApiService.put(`/issues/${issueId}`, { status: newStatus });
      loadDepartmentIssues(); // Refresh department issues
    } catch (error) {
      console.error('Error updating issue status:', error);
    }
  };


  const handleCreateIssue = async (e) => {
    e.preventDefault();
    
    try {
      const issueData = {
        ...newIssue,
        reportedByDepartment: user.department
      };
      
      const createdIssue = await ApiService.post('/issues', issueData);
      
      // Add the new issue to local state
      setReportedIssues(prevIssues => [createdIssue.data, ...prevIssues]);
      
      setNewIssue({ title: '', description: '', category: 'hardware', priority: 'medium' });
      setShowNewIssueForm(false);
    } catch (error) {
      console.error('Failed to create issue:', error);
      alert('Failed to create issue. Please try again.');
    }
  };


  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'routed': return 'bg-blue-100 text-blue-800';
      case 'working': return 'bg-indigo-100 text-indigo-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tech Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* HR Assignment Status */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Your HR Assignment</h3>
              {assignedHR ? (
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 font-medium text-sm">HR</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{assignedHR.name}</p>
                    <p className="text-sm text-gray-500">{assignedHR.email}</p>
                    <p className="text-xs text-green-600">✅ Your issues will be sent to this HR representative</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <span className="text-yellow-600 font-medium text-sm">⚠️</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">No HR Assigned</p>
                    <p className="text-sm text-gray-500">Your issues will be visible to all HR representatives</p>
                    <p className="text-xs text-yellow-600">⚠️ Waiting for HR team assignment</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowNewIssueForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Report Issue to HR
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Issues</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {reportedIssues.filter(issue => issue && issue.status === 'pending').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">W</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Being Worked On</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {reportedIssues.filter(issue => issue && issue.status === 'working').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">R</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {reportedIssues.filter(issue => issue && issue.status === 'resolved').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Issue Form Modal */}
        {showNewIssueForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Report Issue to HR</h3>
              <form onSubmit={handleCreateIssue}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newIssue.title}
                    onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newIssue.category}
                    onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value })}
                  >
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newIssue.priority}
                    onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    required
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    value={newIssue.description}
                    onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                  ></textarea>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowNewIssueForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md hover:bg-orange-700"
                  >
                    Report Issue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reported Issues List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">My Reported Issues</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Track the status of issues you've reported to HR department.
            </p>
            <div className="mt-2 text-xs text-gray-500">
              My reported issues: {reportedIssues.length} | Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <ul className="divide-y divide-gray-200">
            {reportedIssues.length === 0 ? (
              <li className="px-4 py-4 text-center text-gray-500">
                No issues reported yet. Click "Report Issue to HR" to get started.
              </li>
            ) : (
              reportedIssues.filter(issue => issue && issue._id).map((issue) => (
                <li key={issue._id} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {issue.title || 'No title'}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                              {issue.status || 'pending'}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{issue.description || 'No description'}</p>
                        <p className="mt-1 text-xs text-gray-400">
                          Reported: {new Date(issue.createdAt).toLocaleDateString()}
                          {issue.updatedAt && ` | Last updated: ${new Date(issue.updatedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

        {/* Issues Assigned to Tech Department */}
        {departmentIssues.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Issues Assigned to Tech Department</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reported By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departmentIssues.filter(issue => issue && issue.status && issue._id).map((issue) => (
                    <tr key={issue._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{issue.title || 'No title'}</div>
                          <div className="text-sm text-gray-500">{issue.description || 'No description'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{issue.reportedBy || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{issue.reportedByDepartment || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {issue.category || 'other'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(issue.priority)}`}>
                          {issue.priority || 'medium'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                          {issue.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          {issue.status === 'routed' && (
                            <button
                              onClick={() => updateIssueStatus(issue._id, 'working')}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Start Working
                            </button>
                          )}
                          {issue.status === 'working' && (
                            <button
                              onClick={() => updateIssueStatus(issue._id, 'resolved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Mark Resolved
                            </button>
                          )}
                          {issue.status === 'resolved' && (
                            <button
                              onClick={() => updateIssueStatus(issue._id, 'working')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Reopen
                            </button>
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
      </main>
    </div>
  );
};

export default TechDashboard;

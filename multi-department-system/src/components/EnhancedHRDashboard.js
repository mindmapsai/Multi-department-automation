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
    
    // Set up polling to check for new issues every 5 seconds
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Reload data whenever the selected department or active tab changes
  useEffect(() => {
    if (activeTab === 'teams') {
      loadTeamData();
    } else if (activeTab === 'expenses') {
      loadExpenseData();
    }
  }, [selectedDepartment, activeTab]);

  const loadData = async () => {
    try {
      console.log('Loading HR dashboard data...');
      
      // Test basic connection first
      try {
        const testResponse = await ApiService.get('/test-hr');
        console.log('HR test endpoint response:', testResponse);
      } catch (testError) {
        console.warn('HR test endpoint failed, continuing to load rest of data:', testError);
        setNotification(`Authentication or connection issue: ${testError.message}`);
        // Do not return; continue to attempt loading other data
      }
      
      // Load issues
      const issuesResponse = await ApiService.getAllIssues();
      console.log('Issues response:', issuesResponse);
      setIssues(issuesResponse || []);
      
      // Load routing suggestions (optional, don't fail if this doesn't work)
      try {
        const suggestionsResponse = await ApiService.get('/issues/routing-suggestions');
        console.log('Suggestions response:', suggestionsResponse);
        setRoutingSuggestions(suggestionsResponse || []);
      } catch (sugError) {
        console.warn('Routing suggestions failed:', sugError);
        setRoutingSuggestions([]);
      }
      
      // Load team data if on team tab
      if (activeTab === 'teams') {
        await loadTeamData();
      }
      
      console.log('HR dashboard data loaded successfully');
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
        // Get only unassigned users for the selected department
        ApiService.getUnassignedUsers(selectedDepartment)
      ]);
      
      // Pick the correct members array based on the selected department
      const currentTeamMembers = selectedDepartment === 'Tech'
        ? (teamResponse.techMembers || [])
        : selectedDepartment === 'IT'
          ? (teamResponse.itMembers || [])
          : (teamResponse.financeMembers || []);
      const allDepartmentUsers = usersResponse || [];
      
      // Filter out users who are already team members
      const teamMemberIds = new Set(currentTeamMembers.map(member => member._id));
      const availableUsersFiltered = allDepartmentUsers.filter(user => !teamMemberIds.has(user._id));
      
      setTeamMembers(currentTeamMembers);
      setAvailableUsers(availableUsersFiltered);
    } catch (error) {
      console.error('Failed to load team data:', error);
      setNotification('Failed to load team data');
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
      await ApiService.put(`/issues/${issueId}`, {
        status: 'routed',
        routedToDepartment: department,
        assignedToDepartmentUser: userId,
        assignedToDepartmentUserName: userName,
        hrNotes: `Manually routed to ${department} department`
      });
      
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
      // Use department-aware API method
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
      // Use department-aware API method
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

  // Expense management functions
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

  const getExpenseStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingIssues = issues.filter(issue => issue.status === 'pending');
  const routedIssues = issues.filter(issue => issue.status === 'routed');
  const workingIssues = issues.filter(issue => issue.status === 'working');
  const resolvedIssues = issues.filter(issue => issue.status === 'resolved');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading HR Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Notification */}
        {notification && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {notification}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">P</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Issues</dt>
                    <dd className="text-lg font-medium text-gray-900">{pendingIssues.length}</dd>
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
                    <span className="text-white font-bold">R</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Routed</dt>
                    <dd className="text-lg font-medium text-gray-900">{routedIssues.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">W</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Working</dt>
                    <dd className="text-lg font-medium text-gray-900">{workingIssues.length}</dd>
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
                    <span className="text-white font-bold">✓</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Resolved</dt>
                    <dd className="text-lg font-medium text-gray-900">{resolvedIssues.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('issues')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'issues'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Issues Management
              </button>
              <button
                onClick={() => {
                  setActiveTab('teams');
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'teams'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Team Management
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'expenses'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Budget Expenses
              </button>
            </nav>
          </div>
        </div>

        {/* Auto-Route Button - Only show on issues tab */}
        {activeTab === 'issues' && pendingIssues.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowAutoRouteModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-md font-medium transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto-Route {pendingIssues.length} Pending Issues
            </button>
          </div>
        )}

        {/* Issues Management Tab */}
        {activeTab === 'issues' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Issues</h3>
            </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issue Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reporter
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category & Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status & Routing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issues.map((issue) => (
                  <tr key={issue._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{issue.title}</div>
                        <div className="text-sm text-gray-500">{issue.description}</div>
                        {issue.autoRouted && (
                          <div className="text-xs text-blue-600 mt-1">🤖 Auto-routed</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{issue.reportedBy}</div>
                      <div className="text-sm text-gray-500">{issue.reportedByDepartment}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {issue.category}
                        </span>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(issue.priority)}`}>
                          {issue.priority}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(issue.status)}`}>
                          {issue.status}
                        </span>
                        {issue.routedToDepartment && (
                          <div className="text-xs text-gray-600">
                            → {issue.routedToDepartment}
                            {issue.assignedToDepartmentUserName && (
                              <div>({issue.assignedToDepartmentUserName})</div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {issue.status === 'pending' && (
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleManualRoute(issue._id, 'IT', null, null)}
                            className="text-blue-600 hover:text-blue-900 text-xs"
                          >
                            Route to IT
                          </button>
                          <button
                            onClick={() => handleManualRoute(issue._id, 'Finance', null, null)}
                            className="text-green-600 hover:text-green-900 text-xs"
                          >
                            Route to Finance
                          </button>
                          <button
                            onClick={() => handleManualRoute(issue._id, 'Tech', null, null)}
                            className="text-purple-600 hover:text-purple-900 text-xs"
                          >
                            Route to Tech
                          </button>
                        </div>
                      )}
                      {issue.status === 'resolved' && (
                        <button
                          onClick={() => handleStatusUpdate(issue._id, 'closed')}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Close Issue
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {issues.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No issues found.
              </div>
            )}
          </div>
          </div>
        )}

        {/* Team Management Tab */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            {/* Department Selection */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Department</h3>
              <div className="flex space-x-4">
                {['Tech', 'IT', 'Finance'].map((dept) => (
                  <button
                    key={dept}
                    onClick={() => {
                      // Update selected department; loadTeamData will run via useEffect
                      setSelectedDepartment(dept);
                    }}
                    className={`px-4 py-2 rounded-md font-medium ${
                      selectedDepartment === dept
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {dept} Department
                  </button>
                ))}
              </div>
            </div>

            {/* Team Members */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedDepartment} Team Members
                </h3>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Add Member
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers.map((member) => (
                      <tr key={member._id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {member.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleRemoveTeamMember(member._id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {teamMembers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No team members assigned yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {showAddMemberModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Team Member</h3>
              <div className="space-y-4">
                {availableUsers.map((user) => (
                  <div key={user._id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        handleAddTeamMember(user._id);
                        setShowAddMemberModal(false);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
                {availableUsers.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No available users to add.
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Budget Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-6">
            {/* Expense Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">P</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Approval</dt>
                        <dd className="text-lg font-medium text-gray-900">{pendingExpenses.length}</dd>
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
                        <span className="text-white font-bold">✓</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {allExpenses.filter(expense => expense.status === 'approved').length}
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
                      <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold">✗</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {allExpenses.filter(expense => expense.status === 'rejected').length}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Expenses for Approval */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pending Budget Expenses</h3>
                <p className="text-sm text-gray-600">Review and approve/reject expense requests from departments</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingExpenses.map((expense) => (
                      <tr key={expense._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${expense.amount?.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{expense.createdByDepartment}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{expense.createdBy}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {new Date(expense.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleExpenseApproval(expense._id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const notes = prompt('Enter rejection notes (optional):');
                                handleExpenseApproval(expense._id, 'rejected', notes || '');
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pendingExpenses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No pending expenses to review.
                  </div>
                )}
              </div>
            </div>

            {/* All Expenses History */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">All Budget Expenses</h3>
                <p className="text-sm text-gray-600">Complete history of all expense requests</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Approved By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allExpenses.map((expense) => (
                      <tr key={expense._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                          <div className="text-sm text-gray-500">{expense.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${expense.amount?.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{expense.createdByDepartment}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{expense.createdBy}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getExpenseStatusColor(expense.status)}`}>
                            {expense.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{expense.approvedBy || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{expense.hrNotes || '-'}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {allExpenses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No expenses found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auto-Route Modal */}
        {showAutoRouteModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Auto-Route Issues</h3>
              <p className="text-sm text-gray-600 mb-4">
                This will automatically route {pendingIssues.length} pending issues to appropriate departments based on their categories:
              </p>
              <ul className="text-sm text-gray-600 mb-6 space-y-1">
                <li>• Hardware/Software/Network → IT Department</li>
                <li>• Salary/Benefits → Finance Department</li>
                <li>• Policy/Training → HR Department</li>
                <li>• Other → Tech Department</li>
              </ul>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAutoRouteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  disabled={autoRouting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAutoRoute}
                  disabled={autoRouting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  {autoRouting ? 'Routing...' : 'Auto-Route Issues'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedHRDashboard;

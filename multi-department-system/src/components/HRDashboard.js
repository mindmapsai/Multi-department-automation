import React, { useState, useEffect } from 'react';
import ApiService from '../services/api';

const HRDashboard = ({ user, onLogout }) => {
  const [issues, setIssues] = useState([]);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('issues');
  const [routingSuggestions, setRoutingSuggestions] = useState([]);
  const [showRoutingModal, setShowRoutingModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedUser, setSelectedUser] = useState('');

  useEffect(() => {
    loadIssues();
    loadRoutingSuggestions();
    loadTeamData();

    // Set up polling to check for new issues every 5 seconds
    const interval = setInterval(() => {
      loadIssues();
      loadRoutingSuggestions();
      if (activeTab === 'team') {
        loadTeamData();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [activeTab]);

  const loadIssues = async () => {
    try {
      const issuesData = await ApiService.getAllIssues();
      setIssues(issuesData);
    } catch (error) {
      console.error('Failed to load issues:', error);
      setNotification('Failed to load issues');
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const loadRoutingSuggestions = async () => {
    try {
      const suggestions = await ApiService.get('/issues/routing-suggestions');
      setRoutingSuggestions(suggestions || []);
    } catch (error) {
      console.error('Failed to load routing suggestions:', error);
    }
  };

  const handleRouteToDepartment = async () => {
    if (!selectedIssue || !selectedDepartment) {
      setNotification('Please select both issue and department');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    try {
      const response = await ApiService.post(`/issues/${selectedIssue._id}/route-to-department`, {
        department: selectedDepartment,
        assignedUserId: selectedUser || null
      });

      console.log('Route response:', response);

      setShowRoutingModal(false);
      setSelectedIssue(null);
      setSelectedDepartment('');
      setSelectedUser('');

      // Refresh data
      loadIssues();
      loadRoutingSuggestions();

      setNotification(`Issue "${response.issue.title}" routed to ${selectedDepartment} successfully`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error routing issue to department:', error);
      setNotification(`Failed to route issue: ${error.response?.data?.error || error.message}`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const openRoutingModal = (issue) => {
    setSelectedIssue(issue);
    setSelectedDepartment('');
    setSelectedUser('');
    setShowRoutingModal(true);
  };

  const handleAddTeamMember = async (techUserId) => {
    try {
      const response = await ApiService.addTeamMember(techUserId);
      setTeamMembers(response.techMembers);
      setNotification('Team member added successfully');
      setTimeout(() => setNotification(null), 3000);
      loadTeamData(); // Refresh data
    } catch (error) {
      console.error('Failed to add team member:', error);
      setNotification(error.message);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleRemoveTeamMember = async (techUserId) => {
    try {
      const response = await ApiService.removeTeamMember(techUserId);
      setTeamMembers(response.techMembers);
      setNotification('Team member removed successfully');
      setTimeout(() => setNotification(null), 3000);
      loadTeamData(); // Refresh data
    } catch (error) {
      console.error('Failed to remove team member:', error);
      setNotification(error.message);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      const updatedIssue = await ApiService.updateIssueStatus(issueId, newStatus);
      
      // Update local state
      setIssues(prevIssues => 
        prevIssues.map(issue => 
          issue._id === issueId ? updatedIssue : issue
        )
      );
      
      // Show success notification
      setNotification(`Issue "${updatedIssue.title}" updated to ${newStatus}`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Failed to update issue status:', error);
      setNotification('Failed to update issue status');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'working': return 'bg-blue-100 text-blue-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg animate-pulse">
          ✅ {notification}
        </div>
      )}
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
              <p className="text-gray-600">Welcome, {user.name}</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-150 ease-in-out"
            >
              Logout
            </button>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
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
                onClick={() => setActiveTab('routing')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'routing'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Issue Routing
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'issues' && (
            <>
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
                        {issues.filter(issue => issue && issue.status === 'pending').length}
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Working On</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {issues.filter(issue => issue && issue.status === 'working').length}
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
                        {issues.filter(issue => issue && issue.status === 'resolved').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Issues from Tech Team</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Manage and update the status of issues reported by the tech team.
                  </p>
                </div>
                <button
                  onClick={loadIssues}
                  className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                >
                  🔄 Refresh
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Total issues: {issues.length} | Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
            <ul className="divide-y divide-gray-200">
              {issues.length === 0 ? (
                <li className="px-4 py-4 text-center text-gray-500">
                  No issues reported yet.
                </li>
              ) : (
                issues.filter(issue => issue && issue._id).map((issue) => (
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
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-xs text-gray-400">
                            Reported by: <span className="font-medium text-gray-600">{issue.reportedBy || 'Unknown'}</span> | {new Date(issue.createdAt).toLocaleDateString()}
                            {issue.updatedAt && (
                              <span className="ml-2 text-green-600">
                                • Updated: {new Date(issue.updatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {issue.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateIssueStatus(issue._id, 'working')}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1"
                          >
                            🔄 Start Working On This
                          </button>
                          <button
                            onClick={() => updateIssueStatus(issue._id, 'resolved')}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1"
                          >
                            ✅ Mark as Resolved
                          </button>
                        </>
                      )}
                      {issue.status === 'working' && (
                        <>
                          <button
                            onClick={() => updateIssueStatus(issue._id, 'resolved')}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1"
                          >
                            ✅ Mark as Resolved
                          </button>
                          <button
                            onClick={() => updateIssueStatus(issue._id, 'pending')}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors flex items-center gap-1"
                          >
                            ⏸️ Move Back to Pending
                          </button>
                        </>
                      )}
                      {issue.status === 'resolved' && (
                        <button
                          onClick={() => updateIssueStatus(issue._id, 'working')}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1"
                        >
                          🔄 Reopen Issue
                        </button>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
            </>
          )}

          {activeTab === 'routing' && (
            <>
              {/* Routing Suggestions */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Pending Issues for Routing</h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Route pending issues to the appropriate departments based on category and priority.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        loadRoutingSuggestions();
                        loadIssues();
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      🔄 Refresh
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Pending issues: {routingSuggestions.length} | Last updated: {new Date().toLocaleTimeString()}
                  </div>
                </div>
                <ul className="divide-y divide-gray-200">
                  {routingSuggestions.length === 0 ? (
                    <li className="px-4 py-4 text-center text-gray-500">
                      No pending issues to route. All issues have been assigned to departments.
                    </li>
                  ) : (
                    routingSuggestions.filter(suggestion => suggestion && suggestion.issueId).map((suggestion) => (
                      <li key={suggestion.issueId} className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {suggestion.title || 'No title'}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  suggestion.confidence === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {suggestion.confidence || 'medium'} confidence
                                </span>
                              </div>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">{suggestion.category || 'other'} • {suggestion.priority || 'medium'}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              Reported by: <span className="font-medium text-gray-600">{suggestion.reportedBy || 'Unknown'}</span> ({suggestion.reportedByDepartment || 'Unknown'})
                            </p>
                            <p className="mt-1 text-xs text-blue-600">
                              Suggested: <span className="font-medium">{suggestion.suggestedDepartment || 'Tech'}</span>
                              {suggestion.availableUsers && suggestion.availableUsers.length > 0 && (
                                <span className="ml-2">
                                  • Available users: {suggestion.availableUsers.length}
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => openRoutingModal(suggestion)}
                            className="ml-4 px-3 py-1 text-xs font-medium rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                          >
                            Route Issue
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}

          {activeTab === 'team' && (
            <>
              {/* Team Management Section */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md mb-6">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">My Tech Team</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Manage your assigned tech team members. Issues from these members will be sent directly to you.
                  </p>
                </div>
                <ul className="divide-y divide-gray-200">
                  {teamMembers.length === 0 ? (
                    <li className="px-4 py-4 text-center text-gray-500">
                      No team members assigned yet. Add tech users to your team below.
                    </li>
                  ) : (
                    teamMembers.map((member) => (
                      <li key={member._id} className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-blue-600 font-medium text-sm">T</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTeamMember(member._id)}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {/* Unassigned Tech Users */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Available Tech Users</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Tech users who are not assigned to any HR team yet. Add them to your team to receive their issues.
                  </p>
                </div>
                <ul className="divide-y divide-gray-200">
                  {unassignedTechUsers.length === 0 ? (
                    <li className="px-4 py-4 text-center text-gray-500">
                      All tech users are currently assigned to HR teams.
                    </li>
                  ) : (
                    unassignedTechUsers.map((user) => (
                      <li key={user._id} className="px-4 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                <span className="text-yellow-600 font-medium text-sm">⚠️</span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <p className="text-xs text-yellow-600">Not assigned to any HR team</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAddTeamMember(user._id)}
                            className="px-3 py-1 text-xs font-medium rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                          >
                            Add to My Team
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Routing Modal */}
      {showRoutingModal && selectedIssue && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Route Issue to Department</h3>
            <p className="text-sm text-gray-600 mb-4">
              Issue: <strong>{selectedIssue.title}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Category: {selectedIssue.category} • Priority: {selectedIssue.priority}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Department:
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose department...</option>
                <option value="IT">IT Department</option>
                <option value="Finance">Finance Department</option>
                <option value="HR">HR Department</option>
                <option value="Tech">Tech Department</option>
              </select>
            </div>

            {selectedDepartment && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Specific User (Optional):
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Auto-assign to first available user</option>
                  {/* This would be populated with actual users from the selected department */}
                  <option value="user1">User 1 ({selectedDepartment})</option>
                  <option value="user2">User 2 ({selectedDepartment})</option>
                </select>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowRoutingModal(false);
                  setSelectedIssue(null);
                  setSelectedDepartment('');
                  setSelectedUser('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRouteToDepartment}
                disabled={!selectedDepartment}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Route Issue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;

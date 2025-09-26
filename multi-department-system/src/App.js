import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import EnhancedHRDashboard from './components/EnhancedHRDashboard';
import TechDashboard from './components/TechDashboard';
import FinanceDashboard from './components/FinanceDashboard';
import ITDashboard from './components/ITDashboard';
import AIAssistant from './components/AIAssistant';
import ApiService from './services/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in with valid token
    const savedUser = localStorage.getItem('user');
    const authToken = localStorage.getItem('authToken');
    
    if (savedUser && authToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        handleLogout();
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    ApiService.clearToken();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/dashboard" 
            element={
              user ? (
                <>
                  {user.department === 'HR' ? (
                    <EnhancedHRDashboard user={user} onLogout={handleLogout} />
                  ) : user.department === 'Tech' ? (
                    <TechDashboard user={user} onLogout={handleLogout} />
                  ) : user.department === 'IT' ? (
                    <ITDashboard user={user} onLogout={handleLogout} />
                  ) : (
                    <FinanceDashboard user={user} onLogout={handleLogout} />
                  )}
                  <AIAssistant user={user} />
                </>
              ) : (
                <Navigate to="/login" />
              )
            } 
          />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

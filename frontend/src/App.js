import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DriverDashboard from './components/DriverDashboard';
import ActiveRide from './components/ActiveRide';
import IdVerification from './components/IdVerification';
import GuestDashboard from './components/GuestDashboard';
import axios from 'axios';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const response = await axios.get('http://localhost:5000/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
            )
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Register setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
            )
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              user?.role === 'driver' ? (
                <Navigate to="/driver-dashboard" />
              ) : (
                <Dashboard />
              )
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/driver-dashboard" 
          element={
            isAuthenticated && user?.role === 'driver' ? (
              <DriverDashboard />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/active-ride" 
          element={
            isAuthenticated ? (
              <ActiveRide />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/verify-id" 
          element={
            isAuthenticated ? (
              <IdVerification />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/guest" 
          element={<GuestDashboard />} 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              user?.role === 'driver' ? (
                <Navigate to="/driver-dashboard" />
              ) : (
                <Navigate to="/dashboard" />
              )
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
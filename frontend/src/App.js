import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import DriverDashboard from './components/DriverDashboard';
import ActiveRide from './components/ActiveRide';
import IdVerification from './components/IdVerification';
import axios from 'axios';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setUser(response.data);
        setIsAuthenticated(true);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          !isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} /> : 
          (user?.role === 'driver' ? <Navigate to="/driver-dashboard" /> : <Navigate to="/dashboard" />)
        } />
        <Route path="/register" element={
          !isAuthenticated ? <Register setIsAuthenticated={setIsAuthenticated} setUser={setUser} /> : 
          (user?.role === 'driver' ? <Navigate to="/driver-dashboard" /> : <Navigate to="/dashboard" />)
        } />
        <Route path="/verify-id" element={
          isAuthenticated && !user?.id_verified ? 
            <IdVerification user={user} /> : 
            (user?.role === 'driver' ? <Navigate to="/driver-dashboard" /> : <Navigate to="/dashboard" />)
        } />
        <Route path="/dashboard" element={
          isAuthenticated ? (
            user?.id_verified ? 
              <Dashboard user={user} /> : 
              <Navigate to="/verify-id" />
          ) : (
            <Navigate to="/login" />
          )
        } />
        <Route path="/driver-dashboard" element={
          isAuthenticated ? (
            user?.id_verified ? 
              <DriverDashboard user={user} /> : 
              <Navigate to="/verify-id" />
          ) : (
            <Navigate to="/login" />
          )
        } />
        <Route path="/active-ride" element={
          isAuthenticated && user?.id_verified ? 
            <ActiveRide user={user} /> : 
            <Navigate to="/verify-id" />
        } />
        <Route path="/" element={
          isAuthenticated ? 
            (user?.id_verified ? 
              (user?.role === 'driver' ? <Navigate to="/driver-dashboard" /> : <Navigate to="/dashboard" />) :
              <Navigate to="/verify-id" />
            ) : 
            <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}

export default App;
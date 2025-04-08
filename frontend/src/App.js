import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login'; // Default import
import Register from './components/Register'; // Default import
import Dashboard from './components/Dashboard';
import DriverDashboard from './components/DriverDashboard';
import ActiveRide from './components/ActiveRide';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/driver-dashboard" element={<DriverDashboard />} />
        <Route path="/active-ride" element={<ActiveRide />} />
      </Routes>
    </Router>
  );
};

export default App;
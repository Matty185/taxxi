import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';

const DriverPrivateRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isDriver, setIsDriver] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const verifyDriver = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setIsDriver(response.data.role === 'driver');
      } catch (error) {
        console.error('Error verifying driver status:', error);
        setIsDriver(false);
      } finally {
        setLoading(false);
      }
    };

    verifyDriver();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!isDriver) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default DriverPrivateRoute; 
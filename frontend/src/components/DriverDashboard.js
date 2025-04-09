import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Car, MapPin, Clock, Plus, Check } from 'lucide-react';
import axios from 'axios';

// Ride type mapping
const RIDE_TYPES = {
  'personal': 1,
  'family': 2,
  'company': 3
};

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [completedRides, setCompletedRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatingRide, setGeneratingRide] = useState(false);

  // Add initial role check
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        console.log('Decoded token:', decoded);
        if (decoded.role !== 'driver') {
          console.log('Not a driver, redirecting to customer dashboard');
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error decoding token:', error);
        navigate('/login');
      }
    }
  }, [navigate]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/login');
        return;
      }

      const response = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Fetched user data:', response.data);
      
      // Verify user is a driver
      if (response.data.role !== 'driver') {
        console.log('User is not a driver, redirecting to customer dashboard');
        navigate('/dashboard');
        return;
      }
      
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  const fetchAvailableRides = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/driver/available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableRides(response.data);
    } catch (error) {
      console.error('Error fetching available rides:', error);
      setError('Failed to fetch available rides');
    }
  };

  const fetchActiveRide = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/driver/active-ride', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActiveRide(response.data);
    } catch (error) {
      console.error('Error fetching active ride:', error);
    }
  };

  const fetchCompletedRides = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/driver/completed-rides', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCompletedRides(response.data);
    } catch (error) {
      console.error('Error fetching completed rides:', error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchUserData();
      await fetchAvailableRides();
      await fetchActiveRide();
      await fetchCompletedRides();
    };

    fetchData();

    const interval = setInterval(async () => {
      await fetchAvailableRides();
      await fetchActiveRide();
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate]);

  const generateTestRide = async () => {
    setGeneratingRide(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Sample locations in Dublin
      const dublinLocations = [
        { name: "Dublin Airport", coords: [-6.2499, 53.4264] },
        { name: "Trinity College", coords: [-6.2546, 53.3439] },
        { name: "Phoenix Park", coords: [-6.3153, 53.3557] },
        { name: "Guinness Storehouse", coords: [-6.2867, 53.3419] },
        { name: "Dublin Castle", coords: [-6.2674, 53.3429] },
        { name: "St. Stephen's Green", coords: [-6.2602, 53.3382] }
      ];

      // Randomly select pickup and dropoff locations
      const pickup = dublinLocations[Math.floor(Math.random() * dublinLocations.length)];
      let dropoff;
      do {
        dropoff = dublinLocations[Math.floor(Math.random() * dublinLocations.length)];
      } while (dropoff === pickup);

      const testRide = {
        pickupLocation: pickup.name,
        dropoffLocation: dropoff.name,
        pickupCoordinates: {
          longitude: pickup.coords[0],
          latitude: pickup.coords[1]
        },
        dropoffCoordinates: {
          longitude: dropoff.coords[0],
          latitude: dropoff.coords[1]
        },
        passengerCount: Math.floor(Math.random() * 3) + 1, // 1 to 3 passengers
        rideType: Math.floor(Math.random() * 3) + 1 // Random integer between 1 and 3
      };

      console.log('Sending test ride data:', testRide);

      const response = await axios.post(
        'http://localhost:5000/api/driver/generate-test-ride',
        testRide,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Test ride generated successfully:', response.data);
      await fetchAvailableRides();
      setError(null);
    } catch (error) {
      console.error('Error generating test ride:', error);
      const errorMessage = error.response?.data?.details || 
                         error.response?.data?.message || 
                         error.message ||
                         'Failed to generate test ride. Please try again.';
      console.log('Error details:', errorMessage);
      setError(errorMessage);
    } finally {
      setGeneratingRide(false);
    }
  };

  const handleAcceptRide = async (rideId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:5000/api/driver/accept/${rideId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Accept ride response:', response.data);
      
      // Refresh both available rides and active ride
      await fetchAvailableRides();
      await fetchActiveRide();
      setError(null);
    } catch (error) {
      console.error('Error accepting ride:', error);
      setError(error.response?.data?.message || 'Failed to accept ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRide = async (rideId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/driver/${rideId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setActiveRide(null);
      // Refresh all ride lists
      await fetchAvailableRides();
      await fetchCompletedRides();
      setError(null);
    } catch (error) {
      console.error('Error completing ride:', error);
      setError('Failed to complete ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-IE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-1 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-sm font-semibold text-gray-900">Taxxi Driver</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={generateTestRide}
              disabled={generatingRide}
              className="flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-green-500 disabled:bg-gray-400"
            >
              <Plus className="h-3 w-3 mr-1" />
              {generatingRide ? 'Generating...' : 'Generate Test Ride'}
            </button>
            <span className="text-xs text-gray-600">Welcome, {user?.name || 'Driver'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Ride Section */}
        {activeRide && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Active Ride</h2>
            <div className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>From: {activeRide.pickupLocation}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>To: {activeRide.dropoffLocation}</span>
                  </div>
                  {activeRide.passengerCount && (
                    <div className="flex items-center text-gray-600">
                      <Car className="h-4 w-4 mr-2" />
                      <span>Passengers: {activeRide.passengerCount}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>Started: {new Date(activeRide.acceptedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCompleteRide(activeRide.id)}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4 mr-2 inline" />
                  {loading ? 'Completing...' : 'Complete Ride'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Available Rides Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Available Rides</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {availableRides.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No rides available at the moment
            </div>
          ) : (
            <div className="space-y-4">
              {availableRides.map((ride) => (
                <div
                  key={ride.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-2">
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>From: {ride.pickupLocation}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span>To: {ride.dropoffLocation}</span>
                      </div>
                      {ride.passengerCount && (
                        <div className="flex items-center text-gray-600">
                          <Car className="h-4 w-4 mr-2" />
                          <span>Passengers: {ride.passengerCount}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>Requested: {new Date(ride.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptRide(ride.id)}
                      disabled={loading || activeRide}
                      className="bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Accepting...' : 'Accept Ride'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Rides Section */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold mb-4">Completed Rides</h2>
          {completedRides.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No completed rides yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Passengers</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedRides.map((ride) => (
                    <tr key={ride.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDateTime(ride.completed_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ride.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ride.pickup_location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ride.dropoff_location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{ride.ride_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ride.passenger_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard; 
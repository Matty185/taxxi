import React, { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';
import { Search, MapPin, Clock, Car, X, LogOut, Star } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import LocationSearchInput from './LocationSearchInput';

// Set Mapbox token directly
mapboxgl.accessToken = 'pk.eyJ1IjoibWF0dHl0dWQiLCJhIjoiY205MzFxdXJ4MGFmNTJrcjBjNjR1em5ubyJ9.x5Xg1-FVPgJV0w3clJ2NXg';

const RecentLocation = ({ name, description }) => (
  <div className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
    <div className="flex-shrink-0">
      <MapPin className="w-5 h-5 text-pink-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900">{name}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [dropoffCoordinates, setDropoffCoordinates] = useState(null);
  const [activeTab, setActiveTab] = useState('recent');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rideStatus, setRideStatus] = useState({ loading: false, error: null });
  const [activeRide, setActiveRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);
  const [rideType, setRideType] = useState('personal');
  const [passengerCount, setPassengerCount] = useState(1);
  const [clearHistoryStatus, setClearHistoryStatus] = useState({ loading: false, error: null });

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    try {
      console.log('Initializing map...');
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [-6.2603, 53.3498], // Dublin coordinates
        zoom: 12,
        accessToken: mapboxgl.accessToken
      });

      console.log('Map instance created');

      // Handle map load error
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map: ' + (e.error?.message || 'Unknown error'));
      });

      // Handle successful map load
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.resize();
      });

      // Handle style load error
      map.current.on('styledata', (e) => {
        console.log('Style loaded:', e);
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setError('Failed to initialize map: ' + error.message);
    }

    return () => {
      if (map.current) {
        console.log('Cleaning up map instance');
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update map markers when locations change
  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker');
    while(markers[0]) {
      markers[0].remove();
    }

    // Add pickup marker
    if (pickupCoordinates) {
      const marker = new mapboxgl.Marker({ color: '#ec4899' })
        .setLngLat(pickupCoordinates)
        .addTo(map.current);
      
      map.current.flyTo({
        center: pickupCoordinates,
        zoom: 14
      });
    }

    // Add dropoff marker
    if (dropoffCoordinates) {
      new mapboxgl.Marker({ color: '#14b8a6' })
        .setLngLat(dropoffCoordinates)
        .addTo(map.current);

      // If both markers exist, fit bounds to show both
      if (pickupCoordinates) {
        const bounds = new mapboxgl.LngLatBounds()
          .extend(pickupCoordinates)
          .extend(dropoffCoordinates);

        map.current.fitBounds(bounds, {
          padding: 50,
          duration: 1000
        });
      }
    }
  }, [pickupCoordinates, dropoffCoordinates]);

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const response = await fetch('http://localhost:5000/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }

        const userData = await response.json();
        setUser(userData);
        
        // After fetching user, check for active ride
        fetchActiveRide();
        fetchRideHistory();
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const fetchActiveRide = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/rides/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data) {
        setActiveRide(response.data);
      } else {
        setActiveRide(null);
      }
    } catch (error) {
      console.error('Error fetching active ride:', error);
      if (error.response?.status === 404) {
        setActiveRide(null);
      }
    }
  };

  const fetchRideHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/rides/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setRideHistory(response.data);
    } catch (error) {
      console.error('Error fetching ride history:', error);
    }
  };

  const handleStartRide = async () => {
    if (!pickupLocation || !dropoffLocation || !pickupCoordinates || !dropoffCoordinates) {
      setRideStatus({ 
        loading: false, 
        error: "Please select both pickup and drop-off locations from the suggestions"
      });
      return;
    }

    setRideStatus({ loading: true, error: null });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Log the coordinates we received
      console.log('Pickup coordinates:', pickupCoordinates);
      console.log('Dropoff coordinates:', dropoffCoordinates);

      // Ensure coordinates are arrays and convert to numbers
      const pickup = Array.isArray(pickupCoordinates) 
        ? pickupCoordinates.map(Number) 
        : [Number(pickupCoordinates[0]), Number(pickupCoordinates[1])];
      
      const dropoff = Array.isArray(dropoffCoordinates)
        ? dropoffCoordinates.map(Number)
        : [Number(dropoffCoordinates[0]), Number(dropoffCoordinates[1])];

      // Validate coordinates
      if (pickup.some(isNaN) || dropoff.some(isNaN)) {
        throw new Error('Invalid coordinates: coordinates must be valid numbers');
      }

      const requestData = {
        pickupLocation,
        dropoffLocation,
        pickupCoordinates: pickup,
        dropoffCoordinates: dropoff,
        rideType,
        passengerCount
      };

      console.log('Sending request with data:', JSON.stringify(requestData, null, 2));

      const response = await axios.post('http://localhost:5000/api/rides/start', requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response received:', response.data);

      // Store ride data in localStorage for the active ride screen
      const rideData = {
        ...response.data,
        pickupLocation,
        dropoffLocation,
        pickupCoordinates: pickup,
        dropoffCoordinates: dropoff,
        rideType,
        passengerCount
      };

      console.log('Storing ride data in localStorage:', rideData);
      localStorage.setItem('activeRide', JSON.stringify(rideData));

      // Navigate to active ride screen
      navigate('/active-ride');
    } catch (error) {
      console.error('Error starting ride:', error);
      setRideStatus({ 
        loading: false, 
        error: error.message || 'Failed to start ride'
      });
    }
  };

  const handleEndRide = async () => {
    if (!activeRide) return;

    try {
      const token = localStorage.getItem('token');
      console.log('Attempting to end ride:', activeRide.id);

      const response = await axios.post(
        `http://localhost:5000/api/rides/${activeRide.id}/end`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('End ride response:', response.data);

      // Clear active ride from state and localStorage
      setActiveRide(null);
      localStorage.removeItem('activeRide');

      // Refresh ride history
      await fetchRideHistory();

      // Show success message
      setRideStatus({ loading: false, success: 'Ride ended successfully' });
    } catch (error) {
      console.error('Error ending ride:', error);
      setRideStatus({
        loading: false,
        error: error.response?.data?.message || 'Failed to end ride'
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeRide');
    window.location.href = '/login';
  };

  const handleClearHistory = async () => {
    try {
      setClearHistoryStatus({ loading: true, error: null });
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Starting clear history request with token:', token.substring(0, 10) + '...');
      
      const response = await axios.delete('http://localhost:5000/api/rides/history', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Clear history response:', response.data);
      
      // Only clear the history if the request was successful
      if (response.data) {
        await fetchRideHistory(); // Refresh the ride history instead of clearing it directly
        setClearHistoryStatus({ loading: false, error: null });
      }
    } catch (error) {
      console.error('Error clearing ride history:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      let errorMessage;
      if (error.response?.status === 404) {
        errorMessage = 'Server endpoint not found. Please check if the server is running.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please try logging in again.';
      } else {
        errorMessage = error.response?.data?.message || error.message || 'Failed to clear ride history';
      }
      
      setClearHistoryStatus({ 
        loading: false, 
        error: errorMessage
      });
    }
  };

  // Add effect to periodically refresh active ride and history
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchActiveRide();
        fetchRideHistory();
      }
    }, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [loading]);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          setLoading(false);
          return;
        }

        const userResponse = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        setUser(userResponse.data);
        
        // Fetch active ride and history
        await fetchActiveRide();
        await fetchRideHistory();
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-1 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-sm font-semibold text-gray-900">Taxxi</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-600">Welcome, {user?.name || 'User'}</span>
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

      <div className="min-h-screen bg-gray-50">
        <div className="w-[500px] mx-auto py-8">
          {/* Map Container */}
          <div className="bg-white rounded-lg shadow-lg p-2 mb-4">
            <div 
              ref={mapContainer}
              style={{
                width: '100%',
                height: '300px',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            />
          </div>

          {/* Content Container */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Greeting */}
            <h1 className="text-2xl font-semibold mb-6">
              {loading ? (
                <span className="text-gray-400">Loading...</span>
              ) : error ? (
                <span className="text-red-500">Error: {error}</span>
              ) : (
                `Hello there, ${user.name}`
              )}
            </h1>

            {/* Active Ride Status */}
            {activeRide && (
              <div className="mb-6 p-4 bg-pink-50 rounded-lg">
                <h2 className="text-lg font-medium text-pink-700 mb-2">Active Ride</h2>
                <p className="text-sm text-pink-600">From: {activeRide.pickup_location}</p>
                <p className="text-sm text-pink-600">To: {activeRide.dropoff_location}</p>
                <button
                  onClick={handleEndRide}
                  className="mt-3 w-full bg-pink-600 text-white py-2 px-4 rounded-full hover:bg-pink-700"
                >
                  End Ride
                </button>
              </div>
            )}

            {/* Location Search Fields */}
            {!activeRide && (
              <div className="space-y-4 mb-6">
                {/* Pickup Location */}
                <LocationSearchInput
                  placeholder="Enter pickup location"
                  onSelect={(name, coordinates) => {
                    setPickupLocation(name);
                    setPickupCoordinates(coordinates);
                  }}
                />

                {/* Drop-off Location */}
                <LocationSearchInput
                  placeholder="Enter drop-off location"
                  onSelect={(name, coordinates) => {
                    setDropoffLocation(name);
                    setDropoffCoordinates(coordinates);
                  }}
                />

                {/* Passenger Count Input - Only show for family and company rides */}
                {(rideType === 'family' || rideType === 'company') && (
                  <div className="flex items-center space-x-2 py-2">
                    <label htmlFor="passengerCount" className="text-sm text-gray-600">
                      Number of passengers:
                    </label>
                    <select
                      id="passengerCount"
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(Number(e.target.value))}
                      className="ml-2 px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Ride Type Buttons */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <button
                    onClick={() => {
                      setRideType('personal');
                      setPassengerCount(1);
                    }}
                    className={`py-2 px-4 rounded-full text-sm font-medium ${
                      rideType === 'personal'
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Personal Ride
                  </button>
                  <button
                    onClick={() => setRideType('family')}
                    className={`py-2 px-4 rounded-full text-sm font-medium ${
                      rideType === 'family'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Family Ride
                  </button>
                  <button
                    onClick={() => setRideType('company')}
                    className={`py-2 px-4 rounded-full text-sm font-medium ${
                      rideType === 'company'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Company Ride
                  </button>
                </div>

                {/* Start Ride Button */}
                <button
                  onClick={handleStartRide}
                  disabled={rideStatus.loading || !pickupLocation || !dropoffLocation}
                  className={`w-full flex items-center justify-center space-x-2 py-3 rounded-full text-white font-medium
                    ${(rideStatus.loading || !pickupLocation || !dropoffLocation)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : rideType === 'personal'
                      ? 'bg-pink-500 hover:bg-pink-600'
                      : rideType === 'family'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'bg-green-500 hover:bg-green-600'
                    }`}
                >
                  <Car className="w-5 h-5" />
                  <span>
                    {rideStatus.loading 
                      ? 'Starting Ride...' 
                      : `Start ${rideType.charAt(0).toUpperCase() + rideType.slice(1)} Ride`}
                  </span>
                </button>

                {/* Status Messages */}
                {rideStatus.error && (
                  <div className="text-red-500 text-sm text-center mt-2">
                    {rideStatus.error}
                  </div>
                )}
                {rideStatus.success && (
                  <div className="text-green-500 text-sm text-center mt-2">
                    {rideStatus.success}
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-4 mb-4 border-b">
              <button
                onClick={() => setActiveTab('recent')}
                className={`pb-2 px-4 text-sm font-medium ${
                  activeTab === 'recent'
                    ? 'text-pink-500 border-b-2 border-pink-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Recent Rides
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`pb-2 px-4 text-sm font-medium ${
                  activeTab === 'saved'
                    ? 'text-pink-500 border-b-2 border-pink-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Saved Locations
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-1">
              {activeTab === 'recent' ? (
                <div>
                  {rideHistory.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        {rideHistory.map((ride, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">
                                  To: {ride.dropoffLocation}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">
                                  From: {ride.pickupLocation}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {new Date(ride.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                            {ride.rating && (
                              <div className="flex items-center ml-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`h-4 w-4 ${
                                      star <= ride.rating
                                        ? 'text-yellow-400 fill-current'
                                        : 'text-gray-300 stroke-current'
                                    }`}
                                    fill={star <= ride.rating ? 'currentColor' : 'none'}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleClearHistory}
                        disabled={clearHistoryStatus.loading}
                        className={`mt-4 w-full py-2 px-4 rounded-md text-white font-medium transition-colors duration-200 ${
                          clearHistoryStatus.loading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                        }`}
                      >
                        {clearHistoryStatus.loading ? 'Clearing...' : 'Clear Ride History'}
                      </button>
                      {clearHistoryStatus.error && (
                        <p className="mt-2 text-sm text-red-500 text-center">
                          {clearHistoryStatus.error}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2" />
                      <p>No recent rides yet</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-8 h-8 mx-auto mb-2" />
                  <p>No saved locations yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
  
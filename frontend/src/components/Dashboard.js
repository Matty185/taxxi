import React, { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';
import { Search, MapPin, Clock, Car } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

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
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [activeTab, setActiveTab] = useState('recent');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rideStatus, setRideStatus] = useState({ loading: false, error: null });
  const [activeRide, setActiveRide] = useState(null);
  const [rideHistory, setRideHistory] = useState([]);

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-6.2603, 53.3498], // Dublin coordinates
        zoom: 13
      });

      map.current.on('load', () => {
        map.current.resize();
      });

    } catch (error) {
      console.error('Map initialization error:', error);
    }

    return () => {
      if (map.current) map.current.remove();
    };
  }, []);

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
      const response = await fetch('http://localhost:5000/api/rides/active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const ride = await response.json();
        setActiveRide(ride);
      }
    } catch (error) {
      console.error('Error fetching active ride:', error);
    }
  };

  const fetchRideHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/rides/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const rides = await response.json();
        setRideHistory(rides);
      }
    } catch (error) {
      console.error('Error fetching ride history:', error);
    }
  };

  const handleStartRide = async () => {
    if (!pickupLocation || !dropoffLocation) {
      setRideStatus({ 
        loading: false, 
        error: "Please enter both pickup and drop-off locations" 
      });
      return;
    }

    setRideStatus({ loading: true, error: null });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/rides/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickupLocation,
          dropoffLocation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start ride');
      }

      const rideData = await response.json();
      setActiveRide(rideData);
      setPickupLocation("");
      setDropoffLocation("");
      setRideStatus({ 
        loading: false, 
        error: null, 
        success: "Ride started successfully!" 
      });
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
      const response = await fetch(`http://localhost:5000/api/rides/${activeRide.id}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to end ride');
      }

      setActiveRide(null);
      fetchRideHistory(); // Refresh ride history
    } catch (error) {
      console.error('Error ending ride:', error);
    }
  };

  return (
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter pickup location"
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>

              {/* Drop-off Location */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter drop-off location"
                  value={dropoffLocation}
                  onChange={(e) => setDropoffLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>

              {/* Start Ride Button */}
              <button
                onClick={handleStartRide}
                disabled={rideStatus.loading || !pickupLocation || !dropoffLocation}
                className={`w-full flex items-center justify-center space-x-2 py-3 rounded-full text-white font-medium
                  ${(rideStatus.loading || !pickupLocation || !dropoffLocation)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-pink-500 hover:bg-pink-600'
                  }`}
              >
                <Car className="w-5 h-5" />
                <span>{rideStatus.loading ? 'Starting Ride...' : 'Start Ride'}</span>
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
              rideHistory.length > 0 ? (
                rideHistory.map((ride, index) => (
                  <RecentLocation
                    key={index}
                    name={ride.dropoff_location}
                    description={`From: ${ride.pickup_location}`}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2" />
                  <p>No recent rides yet</p>
                </div>
              )
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
  );
};

export default Dashboard;
  
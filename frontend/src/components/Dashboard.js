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

const LocationSearchInput = ({ value, onChange, onSelect, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchLocation = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      // Bias the search to Ireland by using a bounding box
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxgl.accessToken}&country=ie&bbox=-10.76,51.35,-5.99,55.45&types=place,address,poi`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
    }
    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    onChange(value);
    searchLocation(value);
  };

  const handleSuggestionClick = (suggestion) => {
    const locationName = suggestion.place_name;
    onChange(locationName);
    onSelect({
      name: locationName,
      coordinates: suggestion.center
    });
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
      />
      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
      
      {/* Suggestions dropdown */}
      {suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <p className="text-sm font-medium text-gray-900">{suggestion.place_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
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

      const requestData = {
        pickupLocation,
        dropoffLocation,
        pickupCoordinates: {
          longitude: pickupCoordinates[0],
          latitude: pickupCoordinates[1]
        },
        dropoffCoordinates: {
          longitude: dropoffCoordinates[0],
          latitude: dropoffCoordinates[1]
        }
      };

      console.log('Sending request with data:', requestData);
      console.log('Token:', token);

      const response = await fetch('http://localhost:5000/api/rides/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || responseData.error || 'Failed to start ride');
      }

      setActiveRide(responseData);
      setPickupLocation("");
      setDropoffLocation("");
      setPickupCoordinates(null);
      setDropoffCoordinates(null);
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
              <LocationSearchInput
                value={pickupLocation}
                onChange={setPickupLocation}
                onSelect={(location) => {
                  setPickupLocation(location.name);
                  setPickupCoordinates(location.coordinates);
                }}
                placeholder="Enter pickup location"
              />

              {/* Drop-off Location */}
              <LocationSearchInput
                value={dropoffLocation}
                onChange={setDropoffLocation}
                onSelect={(location) => {
                  setDropoffLocation(location.name);
                  setDropoffCoordinates(location.coordinates);
                }}
                placeholder="Enter drop-off location"
              />

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
  
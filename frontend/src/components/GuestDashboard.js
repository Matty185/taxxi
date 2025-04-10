import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { Car, MapPin, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoibWF0dHl0dWQiLCJhIjoiY205MzFxdXJ4MGFmNTJrcjBjNjR1em5ubyJ9.x5Xg1-FVPgJV0w3clJ2NXg';

const GuestDashboard = () => {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [dropoffCoordinates, setDropoffCoordinates] = useState(null);
  const [error, setError] = useState(null);
  const [rideStatus, setRideStatus] = useState({ loading: false, error: null });
  const [simulatedDriver, setSimulatedDriver] = useState(null);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const markersRef = useRef([]);

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

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Handle map load error
      map.current.on('error', (e) => {
        console.error('Map error:', e);
        setError('Failed to load map: ' + (e.error?.message || 'Unknown error'));
      });

      // Handle successful map load
      map.current.on('load', () => {
        console.log('Map loaded successfully');
        map.current.resize();
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setError('Failed to initialize map: ' + error.message);
    }

    // Cleanup function
    return () => {
      if (map.current) {
        console.log('Cleaning up map...');
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when coordinates change
  useEffect(() => {
    if (!map.current) return;

    console.log('Updating markers:', { pickupCoordinates, dropoffCoordinates });

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add pickup marker if coordinates exist
    if (pickupCoordinates && map.current) {
      const marker = new mapboxgl.Marker({ color: '#007bff' })
        .setLngLat(pickupCoordinates)
        .addTo(map.current);
      markersRef.current.push(marker);
    }

    // Add dropoff marker if coordinates exist
    if (dropoffCoordinates && map.current) {
      const marker = new mapboxgl.Marker({ color: '#dc2626' })
        .setLngLat(dropoffCoordinates)
        .addTo(map.current);
      markersRef.current.push(marker);
    }

    // Fit map bounds to include both markers if they exist
    if (pickupCoordinates && dropoffCoordinates && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(pickupCoordinates);
      bounds.extend(dropoffCoordinates);
      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 15
      });
    }
  }, [pickupCoordinates, dropoffCoordinates]);

  const handleLocationSearch = async (query, type) => {
    if (!query.trim()) {
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
      return;
    }

    try {
      console.log(`Searching for ${type} location:`, query);
      
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
        {
          params: {
            access_token: mapboxgl.accessToken,
            country: 'ie',
            limit: 5,
            types: 'address,place,locality,neighborhood',
            proximity: '-6.2603,53.3498' // Dublin coordinates for better local results
          }
        }
      );

      console.log(`${type} search response:`, response.data);

      if (!response.data.features) {
        console.error('No features in response:', response.data);
        return;
      }

      const suggestions = response.data.features.map(feature => ({
        place_name: feature.place_name,
        coordinates: feature.center
      }));

      console.log(`${type} suggestions:`, suggestions);

      if (type === 'pickup') {
        setPickupSuggestions(suggestions);
        setShowPickupSuggestions(true);
      } else if (type === 'dropoff') {
        setDropoffSuggestions(suggestions);
        setShowDropoffSuggestions(true);
      }
    } catch (error) {
      console.error(`${type} location search error:`, error);
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
    }
  };

  const handleLocationSelect = (suggestion, type) => {
    console.log('Location selected:', { suggestion, type });
    
    if (type === 'pickup') {
      setPickupLocation(suggestion.place_name);
      setPickupCoordinates(suggestion.coordinates);
      setShowPickupSuggestions(false);
    } else {
      setDropoffLocation(suggestion.place_name);
      setDropoffCoordinates(suggestion.coordinates);
      setShowDropoffSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.location-input')) {
        setShowPickupSuggestions(false);
        setShowDropoffSuggestions(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      setSimulatedDriver({
        name: "Test Driver",
        vehicleNumber: "12D1234"
      });
      
      setRideStatus({ 
        loading: false, 
        success: 'Ride request successful!'
      });
    } catch (error) {
      console.error('Error starting ride:', error);
      setRideStatus({ 
        loading: false, 
        error: error.message || 'Failed to start ride'
      });
    }
  };

  const handleEndRide = () => {
    setSimulatedDriver(null);
    setPickupLocation("");
    setDropoffLocation("");
    setPickupCoordinates(null);
    setDropoffCoordinates(null);
    setRideStatus({ loading: false, error: null, success: null });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Guest Booking</h1>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Log in
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-6">
        {/* Warning Message */}
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Taxxi reserves the right for our drivers to refuse service to unregistered users.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-white rounded-lg shadow">
            <div ref={mapContainer} style={{ height: '500px' }} className="rounded-lg" />
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="space-y-6">
              {/* Pickup Location */}
              <div className="relative location-input">
                <label className="block text-sm font-medium text-gray-700">Pickup Location</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={pickupLocation}
                    onChange={(e) => {
                      setPickupLocation(e.target.value);
                      handleLocationSearch(e.target.value, 'pickup');
                    }}
                    onFocus={() => setShowPickupSuggestions(true)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter pickup location"
                  />
                </div>
                {/* Pickup Suggestions */}
                {showPickupSuggestions && pickupSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300">
                    {pickupSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleLocationSelect(suggestion, 'pickup')}
                      >
                        {suggestion.place_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dropoff Location */}
              <div className="relative location-input">
                <label className="block text-sm font-medium text-gray-700">Drop-off Location</label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={dropoffLocation}
                    onChange={(e) => {
                      setDropoffLocation(e.target.value);
                      handleLocationSearch(e.target.value, 'dropoff');
                    }}
                    onFocus={() => {
                      setShowDropoffSuggestions(true);
                      if (dropoffLocation.trim()) {
                        handleLocationSearch(dropoffLocation, 'dropoff');
                      }
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter drop-off location"
                  />
                </div>
                {/* Dropoff Suggestions */}
                {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300">
                    {dropoffSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleLocationSelect(suggestion, 'dropoff')}
                      >
                        {suggestion.place_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Start/End Ride Button */}
              <button
                onClick={simulatedDriver ? handleEndRide : handleStartRide}
                disabled={!simulatedDriver && (rideStatus.loading || !pickupLocation || !dropoffLocation)}
                className={`w-full flex items-center justify-center space-x-2 py-3 rounded-full text-white font-medium
                  ${simulatedDriver 
                    ? 'bg-red-500 hover:bg-red-600'
                    : (rideStatus.loading || !pickupLocation || !dropoffLocation)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
              >
                <Car className="w-5 h-5" />
                <span>
                  {simulatedDriver 
                    ? 'End Ride'
                    : rideStatus.loading 
                      ? 'Starting Ride...' 
                      : 'Request Ride'
                  }
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

              {/* Simulated Driver Info */}
              {simulatedDriver && (
                <div className="mt-4 p-4 bg-green-50 rounded-md">
                  <h3 className="text-lg font-medium text-green-800">Driver Assigned</h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p>Driver: {simulatedDriver.name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default GuestDashboard; 
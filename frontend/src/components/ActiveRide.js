import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { Star, MapPin, Car, Clock, X } from 'lucide-react';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set your Mapbox access token
const MAPBOX_TOKEN = 'pk.eyJ1IjoibWF0dHkxNTUiLCJhIjoiY2t0NzJoYjkxMm1uMjJwbXh4cG04bTJpNyJ9.suXrYn_woMd3wNVNEGn8Og';
mapboxgl.accessToken = MAPBOX_TOKEN;

const ActiveRide = () => {
  const navigate = useNavigate();
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [ride, setRide] = useState(null);
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initializeMap = async () => {
      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-6.2603, 53.3498], // Dublin coordinates
          zoom: 13
        });

        // Wait for map to load
        await new Promise((resolve, reject) => {
          map.current.on('load', resolve);
          map.current.on('error', reject);
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        
        // Force a resize to ensure the map fills its container
        map.current.resize();

      } catch (error) {
        console.error('Map initialization error:', error);
        setError('Failed to load map');
      }
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Fetch active ride data
  useEffect(() => {
    const fetchActiveRide = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/rides/active', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data) {
          setRide(response.data);
          // If there's a driver, fetch driver details
          if (response.data.driver_id) {
            const driverResponse = await axios.get(`http://localhost:5000/api/users/${response.data.driver_id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setDriver(driverResponse.data);
          }
        }
      } catch (error) {
        console.error('Error fetching active ride:', error);
        setError('Failed to fetch ride details');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveRide();
  }, [navigate]);

  // Update map markers when ride data changes
  useEffect(() => {
    if (!map.current || !ride) return;

    // Remove existing markers
    const markers = document.getElementsByClassName('mapboxgl-marker');
    while(markers[0]) {
      markers[0].remove();
    }

    // Add pickup marker
    if (ride.pickup_coordinates) {
      new mapboxgl.Marker({ color: '#ec4899' })
        .setLngLat([ride.pickup_coordinates.longitude, ride.pickup_coordinates.latitude])
        .addTo(map.current);
    }

    // Add dropoff marker
    if (ride.dropoff_coordinates) {
      new mapboxgl.Marker({ color: '#3b82f6' })
        .setLngLat([ride.dropoff_coordinates.longitude, ride.dropoff_coordinates.latitude])
        .addTo(map.current);
    }

    // Fit bounds to show both markers
    if (ride.pickup_coordinates && ride.dropoff_coordinates) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([ride.pickup_coordinates.longitude, ride.pickup_coordinates.latitude]);
      bounds.extend([ride.dropoff_coordinates.longitude, ride.dropoff_coordinates.latitude]);
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [ride]);

  const handleEndRide = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/rides/${ride.id}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowReview(true);
    } catch (error) {
      console.error('Error ending ride:', error);
      setError('Failed to end ride');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/rides/${ride.id}/review`, {
        rating,
        review: reviewText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting review:', error);
      setError('Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ride details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <X className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-gray-400 mx-auto" />
          <p className="mt-4 text-gray-600">No active ride found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-1 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-sm font-semibold text-gray-900">Active Ride</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-lg p-2 mb-6">
          <div 
            ref={mapContainer}
            style={{
              width: '100%',
              height: '400px',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          />
        </div>

        {/* Ride Details */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ride Details</h2>
          
          <div className="space-y-4">
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <span>From: {ride.pickup_location}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <span>To: {ride.dropoff_location}</span>
            </div>
            {driver && (
              <div className="flex items-center text-gray-600">
                <Car className="h-5 w-5 mr-2" />
                <span>Driver: {driver.name}</span>
              </div>
            )}
            <div className="flex items-center text-gray-600">
              <Clock className="h-5 w-5 mr-2" />
              <span>Started: {new Date(ride.created_at).toLocaleTimeString()}</span>
            </div>
          </div>

          {!showReview && (
            <button
              onClick={handleEndRide}
              className="mt-6 w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
            >
              End Ride
            </button>
          )}
        </div>

        {/* Review Form */}
        {showReview && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Rate Your Ride</h2>
            <form onSubmit={handleSubmitReview}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Rating
                </label>
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-full ${
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      <Star className="h-6 w-6" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Review (optional)
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
                  rows="4"
                  placeholder="Share your experience..."
                />
              </div>

              <button
                type="submit"
                className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Submit Review
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveRide; 
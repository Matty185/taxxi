import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import { Star, MapPin, Car, Clock, X } from 'lucide-react';
import axios from 'axios';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set Mapbox token
mapboxgl.accessToken = 'pk.eyJ1IjoibWF0dHl0dWQiLCJhIjoiY205MzFxdXJ4MGFmNTJrcjBjNjR1em5ubyJ9.x5Xg1-FVPgJV0w3clJ2NXg';

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
  const markersRef = useRef([]);

  // Load ride data
  useEffect(() => {
    const storedRide = localStorage.getItem('activeRide');
    console.log('Stored ride data:', storedRide);
    
    if (!storedRide) {
      console.log('No active ride found in localStorage');
      navigate('/dashboard');
      return;
    }

    try {
      const rideData = JSON.parse(storedRide);
      console.log('Parsed ride data:', rideData);
      setRide(rideData);
      setLoading(false);
    } catch (error) {
      console.error('Error parsing ride data:', error);
      setError('Failed to load ride data: ' + error.message);
      setLoading(false);
    }
  }, [navigate]);

  // Initialize map after ride data is loaded and component is rendered
  useEffect(() => {
    if (!ride || loading || error || !mapContainer.current) {
      return;
    }

    const initializeMap = async () => {
      try {
        // Clear any existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Format coordinates
        const pickupCoords = Array.isArray(ride.pickupCoordinates) 
          ? ride.pickupCoordinates 
          : [ride.pickupCoordinates.longitude, ride.pickupCoordinates.latitude];
        
        const dropoffCoords = Array.isArray(ride.dropoffCoordinates)
          ? ride.dropoffCoordinates
          : [ride.dropoffCoordinates.longitude, ride.dropoffCoordinates.latitude];

        console.log('Using coordinates:', {
          pickup: pickupCoords,
          dropoff: dropoffCoords
        });

        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: pickupCoords,
          zoom: 12
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

        // Wait for map to load before adding markers
        map.current.once('load', () => {
          console.log('Map loaded, adding markers');

          // Add pickup marker
          const pickupMarker = new mapboxgl.Marker({ color: '#ec4899' })
            .setLngLat(pickupCoords)
            .addTo(map.current);
          markersRef.current.push(pickupMarker);

          // Add dropoff marker
          const dropoffMarker = new mapboxgl.Marker({ color: '#3b82f6' })
            .setLngLat(dropoffCoords)
            .addTo(map.current);
          markersRef.current.push(dropoffMarker);

          // Fit bounds to show both markers
          const bounds = new mapboxgl.LngLatBounds()
            .extend(pickupCoords)
            .extend(dropoffCoords);

          map.current.fitBounds(bounds, {
            padding: 50,
            duration: 1000
          });
        });

      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Failed to initialize map: ' + error.message);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [ride, loading, error]);

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
      
      // Clear active ride data and redirect to dashboard
      localStorage.removeItem('activeRide');
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Active Ride</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <span>From: {ride.pickupLocation}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <MapPin className="h-5 w-5 mr-2" />
              <span>To: {ride.dropoffLocation}</span>
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
                      className="focus:outline-none transition-colors duration-200"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= rating
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300'
                        } hover:text-yellow-400 cursor-pointer transition-colors duration-200`}
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {rating === 0 ? 'Select a rating' : `${rating} star${rating !== 1 ? 's' : ''}`}
                </p>
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
                disabled={rating === 0}
                className={`w-full py-2 px-4 rounded-md text-white font-medium transition-colors duration-200 ${
                  rating === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-pink-500 hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500'
                }`}
              >
                Submit Review
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default ActiveRide; 
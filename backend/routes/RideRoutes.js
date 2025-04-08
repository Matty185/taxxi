const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const auth = require('../middleware/auth');
const client = require('../config/db');

// Start a new ride
router.post('/start', auth, async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    const { pickupLocation, dropoffLocation, pickupCoordinates, dropoffCoordinates } = req.body;
    const userId = req.user.id;

    console.log('User ID:', userId);
    console.log('Parsed coordinates:', {
      pickup: pickupCoordinates,
      dropoff: dropoffCoordinates
    });

    // Validate input
    if (!pickupLocation || !dropoffLocation || !pickupCoordinates || !dropoffCoordinates) {
      console.log('Missing required fields:', {
        hasPickupLocation: !!pickupLocation,
        hasDropoffLocation: !!dropoffLocation,
        hasPickupCoordinates: !!pickupCoordinates,
        hasDropoffCoordinates: !!dropoffCoordinates
      });
      return res.status(400).json({ 
        message: 'Please provide both pickup and drop-off locations with coordinates',
        received: { pickupLocation, dropoffLocation, pickupCoordinates, dropoffCoordinates }
      });
    }

    // Validate coordinate arrays
    if (!Array.isArray(pickupCoordinates) || !Array.isArray(dropoffCoordinates) ||
        pickupCoordinates.length !== 2 || dropoffCoordinates.length !== 2) {
      console.log('Invalid coordinate array format:', {
        pickupIsArray: Array.isArray(pickupCoordinates),
        dropoffIsArray: Array.isArray(dropoffCoordinates),
        pickupLength: pickupCoordinates?.length,
        dropoffLength: dropoffCoordinates?.length
      });
      return res.status(400).json({
        message: 'Coordinates must be arrays with exactly 2 values [longitude, latitude]',
        received: { pickupCoordinates, dropoffCoordinates }
      });
    }

    // Ensure coordinates are in the correct format
    const coordinates = {
      pickup: {
        longitude: parseFloat(pickupCoordinates[0]),
        latitude: parseFloat(pickupCoordinates[1])
      },
      dropoff: {
        longitude: parseFloat(dropoffCoordinates[0]),
        latitude: parseFloat(dropoffCoordinates[1])
      }
    };

    console.log('Formatted coordinates:', coordinates);

    // Validate coordinates are numbers
    if (isNaN(coordinates.pickup.longitude) || isNaN(coordinates.pickup.latitude) ||
        isNaN(coordinates.dropoff.longitude) || isNaN(coordinates.dropoff.latitude)) {
      console.log('Invalid number values in coordinates:', {
        pickupLongitude: coordinates.pickup.longitude,
        pickupLatitude: coordinates.pickup.latitude,
        dropoffLongitude: coordinates.dropoff.longitude,
        dropoffLatitude: coordinates.dropoff.latitude
      });
      return res.status(400).json({ 
        message: 'Invalid coordinate format. Coordinates must be valid numbers.',
        received: { pickupCoordinates, dropoffCoordinates },
        parsed: coordinates
      });
    }

    // Check if user already has an active ride
    const activeRide = await Ride.getActiveRide(userId);
    if (activeRide) {
      return res.status(400).json({ message: 'You already have an active ride' });
    }

    console.log('Creating ride with coordinates:', coordinates);

    const ride = await Ride.createRide(
      userId,
      pickupLocation,
      dropoffLocation,
      new Date(),
      coordinates.pickup,
      coordinates.dropoff
    );

    console.log('Ride created successfully:', ride);

    res.status(201).json(ride);
  } catch (error) {
    console.error('Error starting ride:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      message: 'Failed to start ride', 
      error: error.message,
      details: error.stack,
      code: error.code
    });
  }
});

// Get user's ride history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const rides = await Ride.getRidesByUserId(userId);
    res.json(rides);
  } catch (error) {
    console.error('Error fetching ride history:', error);
    res.status(500).json({ message: 'Failed to fetch ride history', error: error.message });
  }
});

// Get active ride (if any)
router.get('/active', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const activeRide = await Ride.getActiveRide(userId);
    
    if (!activeRide) {
      return res.status(404).json({ message: 'No active ride found' });
    }
    
    res.json(activeRide);
  } catch (error) {
    console.error('Error fetching active ride:', error);
    res.status(500).json({ message: 'Failed to fetch active ride', error: error.message });
  }
});

// End a ride
router.post('/:rideId/end', auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    const ride = await Ride.endRide(rideId, userId);
    
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found or already ended' });
    }
    
    res.json(ride);
  } catch (error) {
    console.error('Error ending ride:', error);
    res.status(500).json({ message: 'Failed to end ride', error: error.message });
  }
});

// Add review to a completed ride
router.post('/:rideId/review', auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const updatedRide = await Ride.addReview(rideId, userId, rating, review);
    
    if (!updatedRide) {
      return res.status(404).json({ message: 'Ride not found or not completed' });
    }
    
    res.json(updatedRide);
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({ message: 'Failed to add review', error: error.message });
  }
});

// Update the clear history route
router.delete('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Clear history request received for user:', userId);
    
    // First check if there are any completed rides for this user
    const checkResult = await client.query(
      'SELECT COUNT(*) FROM rides WHERE user_id = $1 AND status = $2',
      [userId, 'completed']
    );
    
    console.log('Found rides to clear:', checkResult.rows[0].count);
    
    if (parseInt(checkResult.rows[0].count) === 0) {
      console.log('No completed rides found to clear');
      return res.status(200).json({ 
        message: 'No rides to clear',
        clearedRides: 0
      });
    }
    
    // Update completed rides to archived status
    const result = await client.query(
      'UPDATE rides SET status = $1 WHERE user_id = $2 AND status = $3 RETURNING *',
      ['archived', userId, 'completed']
    );
    
    console.log(`Successfully archived ${result.rowCount} rides`);
    
    return res.status(200).json({ 
      message: 'Ride history cleared successfully',
      clearedRides: result.rowCount
    });
  } catch (error) {
    console.error('Error in clear history route:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id || 'unknown',
      url: req.originalUrl,
      method: req.method
    });
    
    return res.status(500).json({ 
      message: 'Failed to clear ride history',
      error: error.message
    });
  }
});

module.exports = router; 
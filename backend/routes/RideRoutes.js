const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const auth = require('../middleware/auth');

// Start a new ride
router.post('/start', auth, async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const { pickupLocation, dropoffLocation, pickupCoordinates, dropoffCoordinates } = req.body;
    const userId = req.user.id;

    console.log('User ID:', userId);
    console.log('Pickup Location:', pickupLocation);
    console.log('Dropoff Location:', dropoffLocation);
    console.log('Pickup Coordinates:', pickupCoordinates);
    console.log('Dropoff Coordinates:', dropoffCoordinates);

    // Validate input
    if (!pickupLocation || !dropoffLocation || !pickupCoordinates || !dropoffCoordinates) {
      return res.status(400).json({ message: 'Please provide both pickup and drop-off locations with coordinates' });
    }

    if (!pickupCoordinates.longitude || !pickupCoordinates.latitude || 
        !dropoffCoordinates.longitude || !dropoffCoordinates.latitude) {
      return res.status(400).json({ message: 'Invalid coordinate format' });
    }

    const ride = await Ride.createRide(
      userId,
      pickupLocation,
      dropoffLocation,
      new Date(),
      pickupCoordinates,
      dropoffCoordinates
    );

    res.status(201).json(ride);
  } catch (error) {
    console.error('Detailed error starting ride:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Failed to start ride', error: error.message });
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

module.exports = router; 
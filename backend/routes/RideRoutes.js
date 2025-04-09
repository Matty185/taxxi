const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const auth = require('../middleware/auth');
const client = require('../config/db');

// Ride type mapping
const RIDE_TYPES = {
  'personal': 1,
  'family': 2,
  'company': 3
};

// Start a new ride
router.post('/start', auth, async (req, res) => {
  try {
    console.log('Received request body:', JSON.stringify(req.body, null, 2));
    const { 
      pickupLocation, 
      dropoffLocation, 
      pickupCoordinates, 
      dropoffCoordinates,
      passengerCount = 1,
      rideType = 'personal'
    } = req.body;
    const userId = req.user.id;

    console.log('User ID:', userId);
    console.log('Parsed coordinates:', {
      pickup: pickupCoordinates,
      dropoff: dropoffCoordinates
    });

    // Convert string ride type to integer
    const rideTypeInt = RIDE_TYPES[rideType] || 1; // Default to personal (1) if invalid type

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

    // Create the ride
    const result = await client.query(`
      INSERT INTO rides (
        user_id,
        pickup_location,
        dropoff_location,
        pickup_coordinates,
        dropoff_coordinates,
        passenger_count,
        ride_type,
        status,
        created_at
      ) VALUES (
        $1, $2, $3,
        point($4, $5),
        point($6, $7),
        $8, $9,
        'pending',
        CURRENT_TIMESTAMP
      )
      RETURNING 
        id,
        pickup_location,
        dropoff_location,
        ST_X(pickup_coordinates::geometry) as pickup_longitude,
        ST_Y(pickup_coordinates::geometry) as pickup_latitude,
        ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
        ST_Y(dropoff_coordinates::geometry) as dropoff_latitude,
        passenger_count,
        ride_type,
        status,
        created_at
    `, [
      userId,
      pickupLocation,
      dropoffLocation,
      pickupCoordinates[0],
      pickupCoordinates[1],
      dropoffCoordinates[0],
      dropoffCoordinates[1],
      passengerCount,
      rideTypeInt
    ]);

    console.log('Ride created successfully:', result.rows[0]);

    res.status(201).json(result.rows[0]);
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

// Get ride history
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching ride history for user:', userId);

    const result = await client.query(`
      SELECT 
        r.id,
        r.pickup_location,
        r.dropoff_location,
        ST_X(pickup_coordinates::geometry) as pickup_longitude,
        ST_Y(pickup_coordinates::geometry) as pickup_latitude,
        ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
        ST_Y(dropoff_coordinates::geometry) as dropoff_latitude,
        r.passenger_count,
        r.ride_type,
        r.status,
        r.created_at,
        r.completed_at,
        r.rating,
        r.review,
        d.name as driver_name,
        d.id as driver_id
      FROM rides r
      LEFT JOIN users d ON r.driver_id = d.id
      WHERE r.user_id = $1 
      AND r.status = 'completed'
      ORDER BY r.completed_at DESC
      LIMIT 10
    `, [userId]);

    console.log('Ride history query result:', result.rows);

    // Format the response
    const rides = result.rows.map(ride => ({
      id: ride.id,
      pickupLocation: ride.pickup_location,
      dropoffLocation: ride.dropoff_location,
      pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
      dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude],
      passengerCount: ride.passenger_count,
      rideType: ride.ride_type,
      status: ride.status,
      createdAt: ride.created_at,
      completedAt: ride.completed_at,
      rating: ride.rating,
      review: ride.review,
      driver: ride.driver_id ? {
        id: ride.driver_id,
        name: ride.driver_name
      } : null
    }));

    res.json(rides);
  } catch (error) {
    console.error('Error fetching ride history:', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ 
      message: 'Failed to fetch ride history',
      details: error.message
    });
  }
});

// Get active ride (if any)
router.get('/active', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching active ride for user:', userId);

    // Query for the user's active ride
    const result = await client.query(`
      SELECT 
        r.id,
        r.pickup_location,
        r.dropoff_location,
        ST_X(pickup_coordinates::geometry) as pickup_longitude,
        ST_Y(pickup_coordinates::geometry) as pickup_latitude,
        ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
        ST_Y(dropoff_coordinates::geometry) as dropoff_latitude,
        r.passenger_count,
        r.ride_type,
        r.status,
        r.created_at,
        r.accepted_at,
        r.completed_at,
        d.name as driver_name,
        d.id as driver_id
      FROM rides r
      LEFT JOIN users d ON r.driver_id = d.id
      WHERE r.user_id = $1 
      AND r.status IN ('pending', 'accepted')
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [userId]);

    console.log('Active ride query result:', result.rows[0]);

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'No active ride found' });
    }

    // Format the response
    const ride = result.rows[0];
    const response = {
      ...ride,
      pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
      dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude],
      driver: ride.driver_id ? {
        id: ride.driver_id,
        name: ride.driver_name
      } : null
    };

    // Remove the individual coordinate fields
    delete response.pickup_longitude;
    delete response.pickup_latitude;
    delete response.dropoff_longitude;
    delete response.dropoff_latitude;
    delete response.driver_id;
    delete response.driver_name;

    console.log('Sending active ride response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching active ride:', {
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });
    res.status(500).json({ 
      message: 'Failed to fetch active ride',
      details: error.message
    });
  }
});

// End a ride
router.post('/:rideId/end', auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;
    
    console.log('Ending ride request:', { rideId, userId });

    // Start a transaction
    await client.query('BEGIN');

    // Check if ride exists and belongs to the user
    const rideCheck = await client.query(`
      SELECT 
        id,
        status, 
        user_id,
        driver_id
      FROM rides 
      WHERE id = $1 
      FOR UPDATE
    `, [rideId]);

    console.log('Ride check result:', rideCheck.rows[0]);

    if (!rideCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        message: 'Ride not found',
        details: { rideId }
      });
    }

    const ride = rideCheck.rows[0];

    if (ride.user_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ 
        message: 'Not authorized to end this ride',
        details: { rideId, userId, rideUserId: ride.user_id }
      });
    }

    if (!['accepted', 'pending'].includes(ride.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        message: 'Ride cannot be ended - invalid status',
        details: { currentStatus: ride.status, allowedStatuses: ['accepted', 'pending'] }
      });
    }

    // Update the ride status
    const updateResult = await client.query(`
      UPDATE rides 
      SET 
        status = 'completed', 
        completed_at = NOW()
      WHERE id = $1 
      RETURNING 
        id,
        status,
        completed_at,
        pickup_location,
        dropoff_location,
        ST_X(pickup_coordinates::geometry) as pickup_longitude,
        ST_Y(pickup_coordinates::geometry) as pickup_latitude,
        ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
        ST_Y(dropoff_coordinates::geometry) as dropoff_latitude
    `, [rideId]);

    console.log('Ride completed:', updateResult.rows[0]);

    await client.query('COMMIT');

    // Format the response
    const completedRide = updateResult.rows[0];
    const response = {
      ...completedRide,
      pickupCoordinates: [completedRide.pickup_longitude, completedRide.pickup_latitude],
      dropoffCoordinates: [completedRide.dropoff_longitude, completedRide.dropoff_latitude]
    };

    // Remove individual coordinate fields
    delete response.pickup_longitude;
    delete response.pickup_latitude;
    delete response.dropoff_longitude;
    delete response.dropoff_latitude;

    res.json({ 
      message: 'Ride ended successfully',
      ride: response
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error ending ride:', {
      error: error.message,
      stack: error.stack,
      rideId: req.params.rideId,
      userId: req.user.id
    });
    res.status(500).json({ 
      message: 'Server error while ending ride',
      details: error.message
    });
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

// Development only - Simulate driver accepting ride
router.post('/:rideId/simulate-accept', auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;
    
    console.log('Simulating driver accept for ride:', rideId);

    // Get a random driver (for simulation)
    const driverResult = await client.query(
      'SELECT id, name FROM users WHERE role = $1 ORDER BY RANDOM() LIMIT 1',
      ['driver']
    );

    if (!driverResult.rows[0]) {
      return res.status(404).json({ message: 'No drivers found in system' });
    }

    const driver = driverResult.rows[0];

    // Update the ride with the driver
    const result = await client.query(`
      UPDATE rides 
      SET status = 'accepted', 
          driver_id = $1,
          accepted_at = NOW()
      WHERE id = $2 
      AND status = 'pending'
      RETURNING 
        id,
        pickup_location,
        dropoff_location,
        ST_X(pickup_coordinates::geometry) as pickup_longitude,
        ST_Y(pickup_coordinates::geometry) as pickup_latitude,
        ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
        ST_Y(dropoff_coordinates::geometry) as dropoff_latitude,
        passenger_count,
        ride_type,
        status,
        created_at,
        accepted_at
    `, [driver.id, rideId]);

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Ride not found or already accepted' });
    }

    // Format the response
    const ride = result.rows[0];
    const response = {
      ...ride,
      pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
      dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude],
      driver: {
        id: driver.id,
        name: driver.name
      }
    };

    // Remove the individual coordinate fields
    delete response.pickup_longitude;
    delete response.pickup_latitude;
    delete response.dropoff_longitude;
    delete response.dropoff_latitude;

    console.log('Driver assigned successfully:', response);
    res.json(response);
  } catch (error) {
    console.error('Error simulating driver accept:', {
      error: error.message,
      stack: error.stack,
      rideId: req.params.rideId
    });
    res.status(500).json({ 
      message: 'Failed to simulate driver acceptance',
      error: error.message
    });
  }
});

module.exports = router; 
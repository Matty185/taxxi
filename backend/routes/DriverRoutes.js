const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const client = require('../config/db');
const bcrypt = require('bcrypt');

// Middleware to check if user is a driver
const isDriver = async (req, res, next) => {
  try {
    const result = await client.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0] || result.rows[0].role !== 'driver') {
      return res.status(403).json({ message: 'Access denied. Drivers only.' });
    }
    next();
  } catch (error) {
    console.error('Error checking driver role:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Ride type mapping
const RIDE_TYPES = {
  'personal': 1,
  'family': 2,
  'company': 3
};

// Generate a test ride
router.post('/generate-test-ride', auth, isDriver, async (req, res) => {
  try {
    console.log('Received test ride request:', req.body);

    // Create a test user if it doesn't exist
    let testUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['test.user@example.com']
    );

    if (!testUser.rows[0]) {
      console.log('Creating test user...');
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      testUser = await client.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        ['Test User', 'test.user@example.com', hashedPassword, 'customer']
      );
      console.log('Test user created with ID:', testUser.rows[0].id);
    }

    const userId = testUser.rows[0].id;
    console.log('Using test user ID:', userId);

    // Validate coordinates
    const pickupLon = req.body.pickupCoordinates?.longitude;
    const pickupLat = req.body.pickupCoordinates?.latitude;
    const dropoffLon = req.body.dropoffCoordinates?.longitude;
    const dropoffLat = req.body.dropoffCoordinates?.latitude;

    if (!pickupLon || !pickupLat || !dropoffLon || !dropoffLat) {
      return res.status(400).json({ message: 'Invalid coordinates provided' });
    }

    // Insert the test ride with explicit column names
    console.log('Inserting test ride...');
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
        (pickup_coordinates[0]) as pickup_longitude,
        (pickup_coordinates[1]) as pickup_latitude,
        (dropoff_coordinates[0]) as dropoff_longitude,
        (dropoff_coordinates[1]) as dropoff_latitude,
        passenger_count, 
        ride_type, 
        status, 
        created_at
    `, [
      userId,
      req.body.pickupLocation,
      req.body.dropoffLocation,
      pickupLon,
      pickupLat,
      dropoffLon,
      dropoffLat,
      req.body.passengerCount || 1,
      req.body.rideType || 1  // Default to 1 for personal rides
    ]);

    console.log('Test ride created:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating test ride:', error);
    res.status(500).json({ 
      message: 'Server error while generating test ride', 
      details: error.message,
      hint: 'Check database connection and schema',
      error: error.toString()
    });
  }
});

// Get all available rides
router.get('/available', auth, isDriver, async (req, res) => {
  try {
    const result = await client.query(`
      SELECT 
        r.id,
        r.pickup_location as "pickupLocation",
        r.dropoff_location as "dropoffLocation",
        (pickup_coordinates[0]) as pickup_longitude,
        (pickup_coordinates[1]) as pickup_latitude,
        (dropoff_coordinates[0]) as dropoff_longitude,
        (dropoff_coordinates[1]) as dropoff_latitude,
        r.passenger_count as "passengerCount",
        r.created_at as "createdAt",
        r.ride_type as "rideType",
        u.name as "customerName"
      FROM rides r
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);

    // Transform coordinates into arrays before sending response
    const rides = result.rows.map(ride => ({
      ...ride,
      pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
      dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude]
    }));

    res.json(rides);
  } catch (error) {
    console.error('Error fetching available rides:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept a ride
router.post('/accept/:rideId', auth, isDriver, async (req, res) => {
  const { rideId } = req.params;
  
  try {
    console.log('Accepting ride:', { rideId, driverId: req.user.id });
    
    // Start a transaction
    await client.query('BEGIN');

    // Check if ride is still available
    const rideCheck = await client.query(
      'SELECT status FROM rides WHERE id = $1 FOR UPDATE',
      [rideId]
    );

    console.log('Ride check result:', rideCheck.rows[0]);

    if (!rideCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (rideCheck.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Ride is no longer available' });
    }

    // Check if driver already has an active ride
    const activeRideCheck = await client.query(
      'SELECT id FROM rides WHERE driver_id = $1 AND status = $2',
      [req.user.id, 'accepted']
    );

    console.log('Active ride check:', activeRideCheck.rows[0]);

    if (activeRideCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'You already have an active ride' });
    }

    // Update the ride with driver information
    const updateResult = await client.query(
      'UPDATE rides SET status = $1, driver_id = $2, accepted_at = NOW() WHERE id = $3 RETURNING *',
      ['accepted', req.user.id, rideId]
    );

    console.log('Ride updated:', updateResult.rows[0]);

    // Commit the transaction
    await client.query('COMMIT');

    res.json({ 
      message: 'Ride accepted successfully',
      ride: updateResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error accepting ride:', {
      error: error.message,
      stack: error.stack,
      rideId,
      driverId: req.user.id
    });
    res.status(500).json({ 
      message: 'Server error while accepting ride',
      details: error.message
    });
  }
});

// Complete a ride
router.post('/:rideId/complete', auth, isDriver, async (req, res) => {
  const { rideId } = req.params;
  
  try {
    await client.query('BEGIN');

    const rideCheck = await client.query(
      'SELECT status, driver_id FROM rides WHERE id = $1 FOR UPDATE',
      [rideId]
    );

    if (!rideCheck.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Ride not found' });
    }

    if (rideCheck.rows[0].status !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Ride cannot be completed' });
    }

    if (rideCheck.rows[0].driver_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Not authorized to complete this ride' });
    }

    await client.query(
      'UPDATE rides SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', rideId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Ride completed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing ride:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active ride for driver
router.get('/active-ride', auth, isDriver, async (req, res) => {
  try {
    const result = await client.query(`
      SELECT 
        r.id,
        r.pickup_location as "pickupLocation",
        r.dropoff_location as "dropoffLocation",
        (pickup_coordinates[0]) as pickup_longitude,
        (pickup_coordinates[1]) as pickup_latitude,
        (dropoff_coordinates[0]) as dropoff_longitude,
        (dropoff_coordinates[1]) as dropoff_latitude,
        r.passenger_count as "passengerCount",
        r.created_at as "createdAt",
        r.accepted_at as "acceptedAt",
        r.ride_type as "rideType",
        u.name as "customerName"
      FROM rides r
      JOIN users u ON r.user_id = u.id
      WHERE r.driver_id = $1 AND r.status = 'accepted'
      ORDER BY r.accepted_at DESC
      LIMIT 1
    `, [req.user.id]);

    // Transform coordinates into arrays before sending response
    const ride = result.rows[0] ? {
      ...result.rows[0],
      pickupCoordinates: [result.rows[0].pickup_longitude, result.rows[0].pickup_latitude],
      dropoffCoordinates: [result.rows[0].dropoff_longitude, result.rows[0].dropoff_latitude]
    } : null;

    res.json(ride);
  } catch (error) {
    console.error('Error fetching active ride:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get completed rides for a driver
router.get('/completed-rides', auth, isDriver, async (req, res) => {
  try {
    const result = await client.query(`
      SELECT 
        r.id,
        r.pickup_location,
        r.dropoff_location,
        (pickup_coordinates[0]) as pickup_longitude,
        (pickup_coordinates[1]) as pickup_latitude,
        (dropoff_coordinates[0]) as dropoff_longitude,
        (dropoff_coordinates[1]) as dropoff_latitude,
        r.passenger_count,
        r.ride_type,
        r.status,
        r.created_at,
        r.completed_at,
        u.name as customer_name
      FROM rides r
      JOIN users u ON r.user_id = u.id
      WHERE r.driver_id = $1 AND r.status = 'completed'
      ORDER BY r.completed_at DESC
      LIMIT 10
    `, [req.user.id]);

    // Transform coordinates into arrays before sending response
    const rides = result.rows.map(ride => ({
      ...ride,
      pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
      dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude]
    }));

    res.json(rides);
  } catch (error) {
    console.error('Error fetching completed rides:', error);
    res.status(500).json({ message: 'Server error while fetching completed rides' });
  }
});

module.exports = router; 
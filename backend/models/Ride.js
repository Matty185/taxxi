// backend/models/Ride.js
const client = require('../config/db');

class Ride {
  // Create a new ride
  static async createRide(userId, pickupLocation, dropoffLocation, startTime, pickupPoint, dropoffPoint) {
    try {
      console.log('Creating ride with params:', {
        userId,
        pickupLocation,
        dropoffLocation,
        startTime,
        pickupPoint,
        dropoffPoint
      });

      const query = `
        INSERT INTO rides (
          user_id, 
          pickup_location, 
          dropoff_location, 
          start_time, 
          status,
          pickup_coordinates,
          dropoff_coordinates
        ) 
        VALUES (
          $1, 
          $2, 
          $3, 
          $4, 
          $5,
          ST_SetSRID(ST_MakePoint($6, $7), 4326),
          ST_SetSRID(ST_MakePoint($8, $9), 4326)
        ) 
        RETURNING *,
        ST_X(pickup_coordinates::geometry) as pickup_longitude,
        ST_Y(pickup_coordinates::geometry) as pickup_latitude,
        ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
        ST_Y(dropoff_coordinates::geometry) as dropoff_latitude`;

      // Ensure coordinates are numbers
      const pickupLng = parseFloat(pickupPoint.longitude);
      const pickupLat = parseFloat(pickupPoint.latitude);
      const dropoffLng = parseFloat(dropoffPoint.longitude);
      const dropoffLat = parseFloat(dropoffPoint.latitude);

      // Validate coordinates
      if (isNaN(pickupLng) || isNaN(pickupLat) || isNaN(dropoffLng) || isNaN(dropoffLat)) {
        throw new Error('Invalid coordinates: coordinates must be valid numbers');
      }

      const values = [
        userId,
        pickupLocation,
        dropoffLocation,
        startTime,
        'active',
        pickupLng,
        pickupLat,
        dropoffLng,
        dropoffLat
      ];

      console.log('Executing query with values:', values);

      const result = await client.query(query, values);
      console.log('Query result:', result.rows[0]);

      // Format the response to include coordinates as arrays
      const ride = result.rows[0];
      return {
        ...ride,
        pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
        dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude]
      };
    } catch (error) {
      console.error('Database error creating ride:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      throw error;
    }
  }

  // Get active ride for a user
  static async getActiveRide(userId) {
    try {
      const query = `
        SELECT 
          r.*,
          ST_X(pickup_coordinates::geometry) as pickup_longitude,
          ST_Y(pickup_coordinates::geometry) as pickup_latitude,
          ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
          ST_Y(dropoff_coordinates::geometry) as dropoff_latitude
        FROM rides r
        WHERE r.user_id = $1 AND r.status = $2`;
      
      const result = await client.query(query, [userId, 'active']);
      
      if (result.rows[0]) {
        const ride = result.rows[0];
        return {
          ...ride,
          pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
          dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude]
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching active ride:', error);
      throw error;
    }
  }

  // Get ride history for a user
  static async getRidesByUserId(userId) {
    try {
      const query = `
        SELECT 
          r.*,
          ST_X(pickup_coordinates::geometry) as pickup_longitude,
          ST_Y(pickup_coordinates::geometry) as pickup_latitude,
          ST_X(dropoff_coordinates::geometry) as dropoff_longitude,
          ST_Y(dropoff_coordinates::geometry) as dropoff_latitude
        FROM rides r
        WHERE r.user_id = $1 
          AND r.status != 'archived'
        ORDER BY start_time DESC`;
      
      const result = await client.query(query, [userId]);
      
      return result.rows.map(ride => ({
        ...ride,
        pickupCoordinates: [ride.pickup_longitude, ride.pickup_latitude],
        dropoffCoordinates: [ride.dropoff_longitude, ride.dropoff_latitude]
      }));
    } catch (error) {
      console.error('Error fetching ride history:', error);
      throw error;
    }
  }

  // End a ride
  static async endRide(rideId, userId) {
    try {
      const result = await client.query(
        'UPDATE rides SET status = $1, end_time = $2 WHERE id = $3 AND user_id = $4 AND status = $5 RETURNING *',
        ['completed', new Date(), rideId, userId, 'active']
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error ending ride:', error);
      throw error;
    }
  }

  // Add review and rating to a ride
  static async addReview(rideId, userId, rating, review) {
    try {
      const result = await client.query(
        'UPDATE rides SET rating = $1, review = $2 WHERE id = $3 AND user_id = $4 AND status = $5 RETURNING *',
        [rating, review, rideId, userId, 'completed']
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  }
}

module.exports = Ride;
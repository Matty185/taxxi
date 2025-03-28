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
          point($6, $7), 
          point($8, $9)
        ) 
        RETURNING *`;

      const values = [
        userId,
        pickupLocation,
        dropoffLocation,
        startTime,
        'active',
        pickupPoint.longitude,  // longitude
        pickupPoint.latitude,   // latitude
        dropoffPoint.longitude, // longitude
        dropoffPoint.latitude   // latitude
      ];

      console.log('Executing query:', query);
      console.log('With values:', values);

      const result = await client.query(query, values);
      console.log('Query result:', result.rows[0]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Database error creating ride:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  // Get active ride for a user
  static async getActiveRide(userId) {
    try {
      const result = await client.query(
        'SELECT * FROM rides WHERE user_id = $1 AND status = $2',
        [userId, 'active']
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching active ride:', error);
      throw error;
    }
  }

  // Get ride history for a user
  static async getRidesByUserId(userId) {
    try {
      const result = await client.query(
        'SELECT * FROM rides WHERE user_id = $1 ORDER BY start_time DESC',
        [userId]
      );
      return result.rows;
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
}

module.exports = Ride;
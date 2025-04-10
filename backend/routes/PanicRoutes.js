const express = require('express');
const router = express.Router();
const client = require('../config/db');
const auth = require('../middleware/auth');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true // Enable debug logging
});

// Verify email configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// Helper function to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper function to format time duration
const formatTimeSince = (startTime) => {
  const now = new Date();
  const start = new Date(startTime);
  const diffInMinutes = Math.floor((now - start) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes`;
  }
  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;
  return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minutes`;
};

// Trigger panic alert
router.post('/trigger', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { rideId, emergencyEmail } = req.body;

    console.log('Received panic alert request:', {
      userId,
      rideId,
      emergencyEmail
    });

    // Validate emergency email
    if (!emergencyEmail || !emergencyEmail.includes('@')) {
      return res.status(400).json({ 
        message: 'Please provide a valid emergency contact email address',
        received: emergencyEmail
      });
    }

    // Start a transaction
    await client.query('BEGIN');

    // Get ride details
    const rideResult = await client.query(`
      SELECT 
        r.*,
        u.name as user_name,
        u.email as user_email,
        d.name as driver_name,
        d.email as driver_email
      FROM rides r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN users d ON r.driver_id = d.id
      WHERE r.id = $1 AND r.user_id = $2
    `, [rideId, userId]);

    if (!rideResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ 
        message: 'Ride not found',
        rideId,
        userId
      });
    }

    const ride = rideResult.rows[0];
    const startTime = new Date(ride.created_at);
    const now = new Date();
    const durationInMinutes = Math.floor((now - startTime) / (1000 * 60));
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    const durationText = hours > 0 
      ? `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`
      : `${minutes} minute${minutes !== 1 ? 's' : ''}`;

    console.log('Found ride:', {
      rideId: ride.id,
      status: ride.status,
      userName: ride.user_name,
      driverName: ride.driver_name,
      duration: durationText
    });

    // Create panic alert record
    const alertResult = await client.query(`
      INSERT INTO panic_alerts (
        ride_id,
        user_id,
        driver_id,
        emergency_email,
        created_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      rideId,
      userId,
      ride.driver_id,
      emergencyEmail
    ]);

    // Send email alert
    const emailText = `
⚠️ EMERGENCY PANIC ALERT ⚠️

A panic alert has been triggered by a passenger in our taxi service.

Passenger Details:
- Name: ${ride.user_name}
- Email: ${ride.user_email}

Driver Details:
- Name: ${ride.driver_name || 'Not assigned'}
- Email: ${ride.driver_email || 'Not assigned'}

Ride Details:
- Started: ${durationText} ago (${startTime.toLocaleString()})
- Pickup Location: ${ride.pickup_location}
- Dropoff Location: ${ride.dropoff_location}
- Current Status: ${ride.status}

This is an urgent alert requiring immediate attention. Please contact emergency services if necessary.

Alert ID: ${alertResult.rows[0].id}
Generated at: ${new Date().toLocaleString()}

This is an automated emergency alert from the TAXXi service.
DO NOT REPLY TO THIS EMAIL.
`;

    try {
      console.log('Attempting to send email to:', emergencyEmail);
      
      const info = await transporter.sendMail({
        from: {
          name: 'TAXXi Emergency Alert System',
          address: process.env.EMAIL_USER
        },
        to: emergencyEmail,
        subject: '🚨 URGENT: TAXXi Emergency Alert - Immediate Action Required',
        text: emailText,
        priority: 'high'
      });

      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected
      });

      await client.query('COMMIT');

      res.json({
        message: 'Panic alert triggered successfully',
        alertId: alertResult.rows[0].id,
        emailSent: true
      });
    } catch (emailError) {
      await client.query('ROLLBACK');
      console.error('Failed to send emergency email:', {
        error: emailError,
        stack: emailError.stack,
        errorCode: emailError.code,
        response: emailError.response
      });
      res.status(500).json({
        message: 'Failed to send emergency alert email',
        error: emailError.message
      });
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing panic alert:', error);
    res.status(500).json({
      message: 'Failed to process panic alert',
      error: error.message
    });
  }
});

module.exports = router; 
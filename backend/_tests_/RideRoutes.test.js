const request = require('supertest');
const app = require('../server');
const Ride = require('../models/Ride');
const auth = require('../middleware/auth');
const client = require('../config/db');
const bcrypt = require('bcryptjs');

jest.mock('../models/Ride'); // Mock the Ride model
jest.mock('../middleware/auth'); // Mock the auth middleware
jest.mock('../config/db'); // Mock the database client

describe('RideRoutes - Start a New Ride', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns an error if the user is not authenticated', async () => {
    auth.mockImplementation((req, res, next) => {
      res.status(401).json({ message: 'Unauthorized' });
    });

    const response = await request(app)
      .post('/api/rides/start')
      .send({
        pickupLocation: 'Location A',
        dropoffLocation: 'Location B',
        pickupCoordinates: { lat: 10.0, lng: 20.0 },
        dropoffCoordinates: { lat: 30.0, lng: 40.0 },
        passengerCount: 2,
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Unauthorized' });
  });

  test('starts a new ride successfully', async () => {
    auth.mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'customer' }; // Mock authenticated user
      next();
    });

    Ride.create.mockResolvedValue({
      id: 1,
      pickupLocation: 'Location A',
      dropoffLocation: 'Location B',
      pickupCoordinates: { lat: 10.0, lng: 20.0 },
      dropoffCoordinates: { lat: 30.0, lng: 40.0 },
      passengerCount: 2,
      userId: 1,
    });

    const response = await request(app)
      .post('/api/rides/start')
      .send({
        pickupLocation: 'Location A',
        dropoffLocation: 'Location B',
        pickupCoordinates: { lat: 10.0, lng: 20.0 },
        dropoffCoordinates: { lat: 30.0, lng: 40.0 },
        passengerCount: 2,
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'Ride started successfully',
      ride: {
        id: 1,
        pickupLocation: 'Location A',
        dropoffLocation: 'Location B',
        pickupCoordinates: { lat: 10.0, lng: 20.0 },
        dropoffCoordinates: { lat: 30.0, lng: 40.0 },
        passengerCount: 2,
        userId: 1,
      },
    });
    expect(Ride.create).toHaveBeenCalledWith({
      pickupLocation: 'Location A',
      dropoffLocation: 'Location B',
      pickupCoordinates: { lat: 10.0, lng: 20.0 },
      dropoffCoordinates: { lat: 30.0, lng: 40.0 },
      passengerCount: 2,
      userId: 1,
    });
  });

  test('returns an error if required fields are missing', async () => {
    auth.mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'customer' }; // Mock authenticated user
      next();
    });

    const response = await request(app)
      .post('/api/rides/start')
      .send({
        pickupLocation: 'Location A',
        dropoffLocation: '', // Missing dropoffLocation
        pickupCoordinates: { lat: 10.0, lng: 20.0 },
        dropoffCoordinates: { lat: 30.0, lng: 40.0 },
        passengerCount: 2,
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Dropoff location is required' });
  });

  test('handles database errors gracefully', async () => {
    auth.mockImplementation((req, res, next) => {
      req.user = { id: 1, role: 'customer' }; // Mock authenticated user
      next();
    });

    Ride.create.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .post('/api/rides/start')
      .send({
        pickupLocation: 'Location A',
        dropoffLocation: 'Location B',
        pickupCoordinates: { lat: 10.0, lng: 20.0 },
        dropoffCoordinates: { lat: 30.0, lng: 40.0 },
        passengerCount: 2,
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });
});
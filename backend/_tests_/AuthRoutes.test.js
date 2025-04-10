const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = require('../server');
const User = require('../models/User');

jest.mock('../models/User'); // Mock the User model
jest.mock('jsonwebtoken'); // Mock the JWT library

describe('AuthRoutes - User Registration', () => {
  const mockUser = {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    password: 'hashedpassword',
    phone: '1234567890',
    role: 'customer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns an error if the email is already in use', async () => {
    User.findByEmail.mockResolvedValue(mockUser); // Mock email already exists

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '1234567890',
        role: 'customer',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: 'Email already in use' });
    expect(User.findByEmail).toHaveBeenCalledWith('john@example.com');
  });

  test('creates a new user successfully', async () => {
    User.findByEmail.mockResolvedValue(null); // Mock email does not exist
    User.create.mockResolvedValue(mockUser); // Mock user creation
    jwt.sign.mockReturnValue('mockToken'); // Mock JWT token generation

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '1234567890',
        role: 'customer',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: 'User registered successfully',
      token: 'mockToken',
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
      },
    });
    expect(User.create).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '1234567890',
      role: 'customer',
    });
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: mockUser.id, role: mockUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  test('generates a JWT token for the new user', async () => {
    User.findByEmail.mockResolvedValue(null); // Mock email does not exist
    User.create.mockResolvedValue(mockUser); // Mock user creation
    jwt.sign.mockReturnValue('mockToken'); // Mock JWT token generation

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '1234567890',
        role: 'customer',
      });

    expect(response.status).toBe(200);
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: mockUser.id, role: mockUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    expect(response.body.token).toBe('mockToken');
  });

  test('handles server errors gracefully', async () => {
    User.findByEmail.mockRejectedValue(new Error('Database error')); // Mock database error

    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '1234567890',
        role: 'customer',
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });
});
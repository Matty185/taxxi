import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import Login from '../Login';

jest.mock('axios');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('Login Component', () => {
  const mockSetIsAuthenticated = jest.fn();
  const mockSetUser = jest.fn();
  const mockNavigate = jest.fn();

  beforeAll(() => {
    delete window.location;
    window.location = { href: '' };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
  });

  test('renders the login form', () => {
    render(
      <MemoryRouter>
        <Login setIsAuthenticated={mockSetIsAuthenticated} setUser={mockSetUser} />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('handles form submission successfully', async () => {
    const mockResponse = {
      data: {
        token: 'mockToken',
        user: { name: 'John Doe', email: 'john@example.com' },
      },
    };
    axios.post.mockResolvedValueOnce(mockResponse);

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={mockSetIsAuthenticated} setUser={mockSetUser} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    expect(axios.post).toHaveBeenCalledWith('http://localhost:5000/api/auth/login', {
      email: 'john@example.com',
      password: 'password123',
    });
    expect(mockSetIsAuthenticated).toHaveBeenCalledWith(true);
    expect(mockSetUser).toHaveBeenCalledWith(mockResponse.data.user);
    expect(window.location.href).toBe('/dashboard');
  });

  test('displays error message on API failure', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });

    render(
      <MemoryRouter>
        <Login setIsAuthenticated={mockSetIsAuthenticated} setUser={mockSetUser} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrongpassword' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    const errorMessage = await screen.findByText(/Invalid credentials/i);
    expect(errorMessage).toBeInTheDocument();
  });

  test('validates required fields', async () => {
    render(
      <MemoryRouter>
        <Login setIsAuthenticated={mockSetIsAuthenticated} setUser={mockSetUser} />
      </MemoryRouter>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });
});
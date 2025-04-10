const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const { MemoryRouter } = require('react-router-dom');
const axios = require('axios');
const Register = require('../Register').default;

jest.mock('axios', () => ({
  post: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(),
}));

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the registration form', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    expect(screen.getByRole('form', { name: /registration-form/i })).toBeInTheDocument();
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
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: '1234567890' } });

    fireEvent.submit(screen.getByRole('form'));

    await screen.findByText(/Redirecting to ID verification/i);
    expect(window.location.href).toBe('/verify-id');
  });

  test('displays error message on API failure', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { message: 'Registration failed' } },
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: '1234567890' } });

    fireEvent.submit(screen.getByRole('form'));

    const errorMessage = await screen.findByText(/Registration failed/i);
    expect(errorMessage).toBeInTheDocument();
  });
});
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import taxxi from '../assets/taxxi.png'; // Import the logo

const Login = ({ setIsAuthenticated, setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Attempting login with:', { email });
      
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });
      
      const { token, user } = response.data;
      console.log('Login response:', { user });
      
      // Store token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update authentication state
      setIsAuthenticated(true);
      setUser(user);
      
      console.log('User role:', user.role);

      // Force a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect based on user role
      if (user.role === 'driver') {
        console.log('Redirecting to driver dashboard');
        window.location.href = '/driver-dashboard';
      } else {
        console.log('Redirecting to customer dashboard');
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <img src={taxxi} alt="TAXXi Logo" style={styles.logo} />
      <form onSubmit={handleLogin} style={styles.form}>
        <input
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Enter your password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
          disabled={loading}
        />
        <button
          type="submit"
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {})
          }}
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
        <p style={styles.link} onClick={() => navigate('/register')}>
          Don't have an account? Sign Up
        </p>
        <div style={styles.divider}>
          <span style={styles.dividerText}>Or</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/guest')}
          style={styles.guestButton}
        >
          Book as guest
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  logo: {
    width: '300px',
    maxWidth: '100%',
    height: 'auto',
    marginBottom: '20px',
    objectFit: 'contain',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '300px',
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  input: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    fontSize: '14px',
  },
  button: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#007bff',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    backgroundColor: '#80bfff',
    cursor: 'not-allowed',
  },
  link: {
    color: '#007bff',
    cursor: 'pointer',
    margin: '10px 0',
    textAlign: 'center',
    fontSize: '14px',
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    margin: '10px 0',
    fontSize: '14px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '15px 0',
  },
  dividerText: {
    flex: 1,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '14px',
    position: 'relative',
  },
  guestButton: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #007bff',
    backgroundColor: 'white',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  }
};

export default Login;
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import taxxi from '../assets/taxxi.png';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      console.log('Attempting registration with:', { name, email, role });
      
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name,
        email,
        password,
        role,
      });

      console.log('Registration response:', response.data);
      
      localStorage.setItem('token', response.data.token);
      
      // Log the navigation attempt
      console.log(`Navigating to ${role === 'driver' ? '/driver-dashboard' : '/dashboard'}`);
      navigate(role === 'driver' ? '/driver-dashboard' : '/dashboard');
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <img src={taxxi} alt="TAXXi Logo" style={styles.logo} />
      <form onSubmit={handleRegister} style={styles.form}>
        <input
          type="text"
          placeholder="Enter your full name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="email"
          placeholder="Enter your email..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
          required
        />
        <input
          type="password"
          placeholder="Enter your password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          required
        />
        
        <div style={styles.roleContainer}>
          <label style={styles.roleLabel}>Register as:</label>
          <div style={styles.roleButtons}>
            <button
              type="button"
              onClick={() => setRole('customer')}
              style={{
                ...styles.roleButton,
                ...(role === 'customer' ? styles.roleButtonActive : {})
              }}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => setRole('driver')}
              style={{
                ...styles.roleButton,
                ...(role === 'driver' ? styles.roleButtonActive : {})
              }}
            >
              Driver
            </button>
          </div>
        </div>

        <button type="submit" style={styles.button}>
          Register
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </form>
      <p style={styles.link} onClick={() => navigate('/login')}>
        Already have an account? Sign In
      </p>
      <p style={styles.link} onClick={() => navigate('/book-without-registration')}>
        Book without registration
      </p>
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
  },
  input: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  roleContainer: {
    margin: '10px 0',
  },
  roleLabel: {
    marginBottom: '8px',
    color: '#333',
    fontSize: '14px',
  },
  roleButtons: {
    display: 'flex',
    gap: '10px',
  },
  roleButton: {
    flex: 1,
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '5px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roleButtonActive: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderColor: '#0056b3',
  },
  button: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#007bff',
    color: '#fff',
    cursor: 'pointer',
  },
  link: {
    color: '#007bff',
    cursor: 'pointer',
    margin: '5px 0',
  },
  error: {
    color: 'red',
    textAlign: 'center',
  },
};

export default Register;
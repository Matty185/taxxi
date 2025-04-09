import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import taxxi from '../assets/taxxi.png';

const Register = ({ setIsAuthenticated, setUser }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (selectedRole) => {
    setFormData({
      ...formData,
      role: selectedRole
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Sending registration data:', formData);
      
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role
      });
      
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setIsAuthenticated(true);
      setUser(user);
      
      // Always redirect to ID verification first
      window.location.href = '/verify-id';
    } catch (err) {
      console.error('Registration error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div style={styles.container}>
      <img src={taxxi} alt="TAXXi Logo" style={styles.logo} />
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.roleContainer}>
          <p style={styles.roleLabel}>Register as:</p>
          <div style={styles.roleButtons}>
            <button
              type="button"
              onClick={() => handleRoleChange('customer')}
              style={{
                ...styles.roleButton,
                ...(formData.role === 'customer' ? styles.roleButtonActive : {})
              }}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('driver')}
              style={{
                ...styles.roleButton,
                ...(formData.role === 'driver' ? styles.roleButtonActive : {})
              }}
            >
              Driver
            </button>
          </div>
        </div>

        <input
          type="text"
          name="name"
          placeholder="Enter your full name..."
          value={formData.name}
          onChange={handleChange}
          style={styles.input}
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Enter your email..."
          value={formData.email}
          onChange={handleChange}
          style={styles.input}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Enter your password..."
          value={formData.password}
          onChange={handleChange}
          style={styles.input}
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Enter your phone number..."
          value={formData.phone}
          onChange={handleChange}
          style={styles.input}
          required
        />

        <button type="submit" style={styles.button}>
          Register
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </form>
      <p style={styles.link} onClick={() => navigate('/login')}>
        Already have an account? Sign In
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
  roleContainer: {
    marginBottom: '20px',
    width: '100%',
  },
  roleLabel: {
    marginBottom: '10px',
    color: '#333',
    fontSize: '14px',
    textAlign: 'center',
  },
  roleButtons: {
    display: 'flex',
    gap: '10px',
    width: '100%',
  },
  roleButton: {
    flex: 1,
    padding: '10px',
    border: '1px solid #007bff',
    borderRadius: '5px',
    backgroundColor: '#fff',
    color: '#007bff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
  },
  roleButtonActive: {
    backgroundColor: '#007bff',
    color: '#fff',
  },
  input: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  button: {
    margin: '10px 0',
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#007bff',
    color: '#fff',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  link: {
    color: '#007bff',
    cursor: 'pointer',
    margin: '5px 0',
  },
  error: {
    color: 'red',
    textAlign: 'center',
  }
};

export default Register;
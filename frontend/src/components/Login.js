import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import taxxi from '../assets/taxxi.png'; // Import the logo

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password,
      });
      localStorage.setItem('token', response.data.token); // Save the JWT token
      navigate('/dashboard'); // Redirect to the dashboard after login
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Add the logo */}
      <img src={taxxi} alt="TAXXi Logo" style={styles.logo} />
      <form onSubmit={handleLogin} style={styles.form}>
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
        <button type="submit" style={styles.button}>
          Login
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </form>
      <p style={styles.link} onClick={() => navigate('/register')}>
        Don't have an account? Sign Up
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
    width: '300px', // Match the width of the form
    maxWidth: '100%', // Ensure it doesn't overflow on smaller screens
    height: 'auto', // Maintain aspect ratio
    marginBottom: '20px', // Add spacing below the logo
    objectFit: 'contain', // Ensure the logo scales properly
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

export default Login;
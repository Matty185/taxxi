import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import taxxi from '../assets/taxxi.png'; // Ensure the path is correct

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/auth/register', {
        email,
        password,
      });
      localStorage.setItem('token', response.data.token); // Save the JWT token
      navigate('/dashboard'); // Redirect to the dashboard after registration
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Logo with adjusted size */}
      <img src={taxxi} alt="TAXXi Logo" style={styles.logo} />
      <form onSubmit={handleRegister} style={styles.form}>
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

export default Register;
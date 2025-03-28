const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    // Log the incoming authorization header
    console.log('Auth Header:', req.header('Authorization'));
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Extracted token:', token);
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Log the JWT_SECRET (first few characters for security)
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified:', verified);
    
    req.user = verified;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token', error: error.message });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', error: error.message });
    }
    res.status(401).json({ message: 'Token verification failed', error: error.message });
  }
};

module.exports = auth; 
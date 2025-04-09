const express = require("express");
const router = express.Router();
const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const auth = require("../middleware/auth");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/ids');
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, `id-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});

// Upload ID for verification
router.post("/verify-id", auth, upload.single('idImage'), async (req, res) => {
    try {
        console.log('Received ID verification request');
        console.log('Request headers:', req.headers);
        console.log('Request body:', req.body);
        console.log('Request file:', req.file);
        
        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('File uploaded successfully:', {
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size
        });

        // Update user's verification status
        const user = await User.updateIdVerification(req.user.id, true);
        console.log('User verification status updated:', user);
        
        res.json({ 
            message: 'ID uploaded successfully. Verification pending.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                id_verified: user.id_verified
            }
        });
    } catch (error) {
        console.error('ID verification error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error processing ID verification',
            error: error.message
        });
    }
});

// Register a new user
router.post("/register", async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  try {
    console.log('Registration request received:', { name, email, role });

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Validate role
    if (!role || !['customer', 'driver'].includes(role)) {
      console.log('Invalid role specified:', role);
      return res.status(400).json({ message: "Invalid role specified. Must be 'customer' or 'driver'" });
    }

    // Check if the email is already in use
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log('Email already in use:', email);
      return res.status(400).json({ message: "Email already in use" });
    }

    // Create a new user
    console.log('Creating new user with role:', role);
    const newUser = await User.create({ 
      name,
      email, 
      password,
      phone,
      role 
    });
    
    console.log('User created successfully:', { id: newUser.id, email: newUser.email, role: newUser.role });
    
    // Generate a JWT token
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );
    
    const responseData = { 
      message: "User registered successfully", 
      token,
      user: { 
        id: newUser.id, 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role 
      } 
    };
    console.log('Sending registration response:', responseData);
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Login an existing user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log('Login attempt for email:', email);
    
    // Find the user by email
    const user = await User.findByEmail(email);
    console.log('Found user:', user ? { id: user.id, email: user.email, role: user.role } : 'No user found');
    
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the hashed password in the database
    const isMatch = await User.verifyPassword(user, password);
    console.log('Password match:', isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );
    
    console.log('Generated token for user:', { id: user.id, role: user.role });
    
    const responseData = { 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    };
    console.log('Sending response:', responseData);
    
    res.json(responseData);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
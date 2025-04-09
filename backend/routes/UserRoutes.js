const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/ids';
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

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create new user
        const user = await User.create({ username, email, password, phone });
        res.status(201).json({ 
            message: 'User registered successfully. Please upload your ID for verification.',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                id_verified: user.id_verified
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// Upload ID for verification
router.post('/verify-id', auth, upload.single('idImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // In a real application, you would:
        // 1. Store the file path in the database
        // 2. Process the image to verify gender
        // 3. Update the user's verification status
        
        // For now, we'll just update the verification status
        const user = await User.updateIdVerification(req.user.id, true);
        
        res.json({ 
            message: 'ID uploaded successfully. Verification pending.',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                id_verified: user.id_verified
            }
        });
    } catch (error) {
        console.error('ID verification error:', error);
        res.status(500).json({ message: 'Error processing ID verification' });
    }
});

// Get user verification status
router.get('/verification-status', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({ id_verified: user.id_verified });
    } catch (error) {
        console.error('Error getting verification status:', error);
        res.status(500).json({ message: 'Error getting verification status' });
    }
});

module.exports = router; 
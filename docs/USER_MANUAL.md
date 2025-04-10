# Taxxi - User Manual

## Overview
Taxxi is a women-focused ride-hailing platform designed to provide safe and reliable transportation services across Ireland. This application connects female passengers with verified female drivers, offering enhanced safety features and real-time ride tracking.

## Who is this for?
- Female passengers seeking safe transportation
- Female drivers looking to provide ride services
- Families and businesses requiring reliable transportation services
- Guest users requiring immediate ride services

## Hardware Requirements
- Smartphone or computer with internet access
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Stable internet connection
- Device with GPS capabilities for real-time tracking
- Camera (for ID verification)

## Installation Guide
1. **For Users**
   - No installation required
   - Access the platform at [website URL]
   - Compatible with all modern web browsers

2. **For Developers**
   - Clone the repository
   - Install Node.js and PostgreSQL
   - Set up environment variables:
     1. Create a `.env` file in the backend directory
     2. Add the following variables:
        ```
        PORT=5000
        DB_USER=postgres
        DB_HOST=localhost
        DB_NAME=taxxi
        DB_PORT=5432
        DB_PASSWORD=your_password
        JWT_SECRET=your_jwt_secret_key
        EMAIL_USER=your_gmail_address
        EMAIL_PASSWORD=your_gmail_app_password
        MAPBOX_TOKEN=your_mapbox_token
        ```
     3. Replace placeholder values:
        - `your_password`: Your local PostgreSQL password (default is empty for fresh installations)
        - `your_jwt_secret_key`: A secure random string for JWT encryption
        - `your_gmail_address`: Gmail address for sending alerts
        - `your_gmail_app_password`: Gmail App Password (requires 2FA)
        - `your_mapbox_token`: MapBox API token for maps functionality
   - Run npm install in both frontend and backend directories
   - Set up the database:
     1. Navigate to the backend directory:
        ```
        cd backend
        ```
     2. Run the database setup script:
        ```
        npm run setup-db
        ```
     3. This script will:
        - Create the taxxi database if it doesn't exist
        - Set up all required tables
        - Configure necessary permissions
        - You should see "Database setup completed successfully!" when finished

## Running the Software
### For Users
1. Open your web browser
2. Navigate to [website URL]
3. Create an account or continue as guest
4. Enable location services when prompted

### For Developers
1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```
2. Start the frontend application:
   ```
   cd frontend
   npm start
   ```

## How to Use the Software

### 1. Account Management
- Creating a new account
- Verifying your identity
- Managing your profile
- Resetting password

### 2. Booking a Ride
- Selecting pickup and dropoff locations
- Choosing ride type (Standard/Family/Business)
- Setting passenger count
- Confirming booking

### 3. During the Ride
- Real-time tracking
- Using the panic button
- Contacting the driver
- Sharing ride details

### 4. After the Ride
- Rating and reviewing
- Viewing ride history
- Submitting feedback
- Managing favorites

### 5. Safety Features
- Emergency contacts
- Panic alert system
- ID verification process
- Real-time location sharing

## How to Quit/Exit
- For users: Simply close the browser tab
- For active rides: Please wait until ride completion
- For developers: Use Ctrl+C in terminal to stop servers

## Screenshots
[Include screenshots here of key features and functionalities]

1. Homepage and Login
2. Booking Interface
3. Real-time Tracking
4. Safety Features
5. User Profile
6. Ride History
7. Rating System
8. Emergency Features

## Support and Contact
- Technical Support: [email]
- Emergency Support: [24/7 contact]
- Feature Requests: [feedback form]
- Bug Reports: [reporting system]

---
*Note: This manual is part of the Taxxi platform and is regularly updated to reflect the latest features and improvements.* 
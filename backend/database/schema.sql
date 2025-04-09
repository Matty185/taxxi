-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'driver')),
    phone VARCHAR(20),
    license_number VARCHAR(50),
    car_model VARCHAR(100),
    car_plate VARCHAR(20),
    is_available BOOLEAN DEFAULT true,
    current_location GEOMETRY(Point, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create rides table
CREATE TABLE IF NOT EXISTS rides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    driver_id INTEGER REFERENCES users(id),
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    pickup_coordinates GEOMETRY(Point, 4326) NOT NULL,
    dropoff_coordinates GEOMETRY(Point, 4326) NOT NULL,
    passenger_count INTEGER DEFAULT 1,
    ride_type VARCHAR(50) DEFAULT 'personal',
    status VARCHAR(50) DEFAULT 'pending',
    fare DECIMAL(10, 2),
    rating INTEGER,
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on ride status for faster queries
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);

-- Create index on user role and availability for faster queries
CREATE INDEX IF NOT EXISTS idx_users_role_availability ON users(role, is_available); 
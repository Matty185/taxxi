const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const client = require('../config/db'); // Import the database connection

class User {
  // Find a user by email
  static async findByEmail(email) {
    try {
      const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0]; // Return the user object if found, otherwise undefined
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Create a new user
  static async createUser(name, email, password) {
    try {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Insert the user into the database
      const result = await client.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, passwordHash]
      );

      return result.rows[0]; // Return the newly created user
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }
}

module.exports = User;
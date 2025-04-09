const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

class User {
  // Find a user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    return result.rows[0]; // Return the user object if found, otherwise undefined
  }

  // Find a user by ID
  static async findById(id) {
    const query = 'SELECT id, name, email, phone, id_verified, role FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0]; // Return the user object if found, otherwise undefined
  }

  // Create a new user
  static async create({ name, email, password, phone, role }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `
      INSERT INTO users (name, email, password_hash, phone, role, id_verified)
      VALUES ($1, $2, $3, $4, $5, false)
      RETURNING id, name, email, phone, role, id_verified;
    `;
    const values = [name, email, hashedPassword, phone, role];
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the newly created user
  }

  static async updateIdVerification(userId, verified) {
    try {
        const result = await pool.query(
            'UPDATE users SET id_verified = $1 WHERE id = $2 RETURNING id, name, email, id_verified',
            [verified, userId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error updating ID verification:', error);
        throw error;
    }
  }

  static async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  }
}

module.exports = User;
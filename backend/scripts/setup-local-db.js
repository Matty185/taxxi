const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    console.log('Setting up local database...');

    // Create database if it doesn't exist
    await execPromise('createdb -U postgres taxxi');

    // Connect to the database and run schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await execPromise(`psql -U postgres -d taxxi -f ${schemaPath}`);

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
};

// Helper function to promisify exec
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 1 && error.message.includes('already exists')) {
          console.log('Database already exists, continuing...');
          resolve();
        } else {
          reject(error);
        }
        return;
      }
      resolve(stdout);
    });
  });
};

setupDatabase(); 
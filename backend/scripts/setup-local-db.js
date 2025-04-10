const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const setupDatabase = async () => {
  try {
    console.log('Setting up local database...');

    // Drop database if it exists and create a new one
    try {
      await execPromise('dropdb -U postgres --if-exists taxxi');
      console.log('Dropped existing database');
    } catch (error) {
      console.log('No existing database to drop');
    }

    // Create new database
    await execPromise('createdb -U postgres taxxi');
    console.log('Created new database');

    // Connect to the database and run schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Execute schema creation
    await execPromise(`psql -U postgres -d taxxi -f ${schemaPath}`);
    console.log('Schema created successfully');

    // Grant necessary permissions
    const grantCommands = [
      'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;',
      'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;',
      'GRANT ALL PRIVILEGES ON DATABASE taxxi TO postgres;',
      'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;'
    ];

    for (const command of grantCommands) {
      await execPromise(`psql -U postgres -d taxxi -c "${command}"`);
    }

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
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

setupDatabase(); 
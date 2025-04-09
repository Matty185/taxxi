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

    // Execute schema creation
    await execPromise(`psql -U postgres -d taxxi -f ${schemaPath}`);

    // Grant permissions after tables are created
    const grantCommands = [
      'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;',
      'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;',
      'GRANT ALL PRIVILEGES ON DATABASE taxxi TO postgres;'
    ];

    for (const command of grantCommands) {
      await execPromise(`psql -U postgres -d taxxi -c "${command}"`);
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('Database already exists, continuing with schema updates...');
      try {
        // Try to update schema and permissions
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        await execPromise(`psql -U postgres -d taxxi -f ${schemaPath}`);
        
        const grantCommands = [
          'GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;',
          'GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;',
          'GRANT ALL PRIVILEGES ON DATABASE taxxi TO postgres;'
        ];

        for (const command of grantCommands) {
          await execPromise(`psql -U postgres -d taxxi -c "${command}"`);
        }
        
        console.log('Schema and permissions updated successfully!');
      } catch (schemaError) {
        console.error('Error updating schema:', schemaError);
        process.exit(1);
      }
    } else {
      console.error('Error setting up database:', error);
      process.exit(1);
    }
  }
};

// Helper function to promisify exec
const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error && !error.message.includes('already exists')) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

setupDatabase(); 
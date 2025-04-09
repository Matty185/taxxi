const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const schemaPath = path.join(__dirname, '../database/schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

console.log('Running database migrations...');

exec(`psql "${connectionString}" -f ${schemaPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error('Error running migrations:', error);
    return;
  }
  if (stderr) {
    console.error('Migration stderr:', stderr);
  }
  console.log('Migrations completed successfully!');
}); 
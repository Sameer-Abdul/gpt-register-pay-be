import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

async function resetDatabase() {
  const connection = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '7799179121',
    database: 'postgres', // Connect to default database
  });

  try {
    await connection.initialize();
    const dbName = process.env.DB_NAME || 'register_payment';
    
    // Terminate all connections to the database
    await connection.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid();
    `);
    
    // Drop the database if it exists
    await connection.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    
    // Create a new database
    await connection.query(`CREATE DATABASE "${dbName}"`);
    
    console.log(`Database ${dbName} has been reset successfully.`);
    
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    await connection.destroy();
  }
}

resetDatabase().catch(console.error);

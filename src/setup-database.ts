import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { InitialSchema1730630000000 } from './migrations/1730630000000-InitialSchema';

// Load environment variables
config();

async function setupDatabase() {
  // First, reset the database
  console.log('Resetting database...');
  const resetConnection = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '7799179121',
    database: 'postgres', // Connect to default database
  });

  try {
    await resetConnection.initialize();
    const dbName = process.env.DB_NAME || 'register_payment';
    
    // Terminate all connections to the database
    await resetConnection.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid();
    `);
    
    // Drop the database if it exists
    await resetConnection.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    
    // Create a new database
    await resetConnection.query(`CREATE DATABASE "${dbName}"`);
    
    console.log(`Database ${dbName} has been reset successfully.`);
    
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    await resetConnection.destroy();
  }

  // Now run migrations
  console.log('Running migrations...');
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '7799179121',
    database: process.env.DB_NAME || 'register_payment',
    entities: [
      'src/**/*.entity{.ts,.js}'
    ],
    migrations: [
      InitialSchema1730630000000
    ],
    migrationsRun: true,
    logging: true,
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Migrations have been run successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

setupDatabase()
  .then(() => console.log('Database setup completed successfully!'))
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });

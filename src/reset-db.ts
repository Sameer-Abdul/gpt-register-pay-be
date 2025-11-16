import { AppDataSource } from './data-source';
import * as fs from 'fs';
import * as path from 'path';

async function resetDatabase() {
  try {
    // Initialize the data source
    await AppDataSource.initialize();
    
    // Get the database name from the connection options
    const dbName = AppDataSource.options.database as string;
    const queryRunner = AppDataSource.createQueryRunner();
    
    console.log(`Dropping database: ${dbName}`);
    
    // Disconnect all active connections to the database
    await queryRunner.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid();
    `);
    
    // Drop the database
    await queryRunner.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    
    // Recreate the database
    console.log(`Creating database: ${dbName}`);
    await queryRunner.query(`CREATE DATABASE "${dbName}"`);
    
    console.log('Database reset successfully');
    
    // Run migrations
    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully');
    
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    await AppDataSource.destroy();
    process.exit(0);
  }
}

resetDatabase();

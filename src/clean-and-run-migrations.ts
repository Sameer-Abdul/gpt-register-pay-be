import { AppDataSource } from './data-source';

async function cleanAndRunMigrations() {
  try {
    // Initialize the data source
    await AppDataSource.initialize();
    
    // Drop the migrations table if it exists
    console.log('Dropping migrations table...');
    await AppDataSource.query('DROP TABLE IF EXISTS migrations');
    
    // Recreate the migrations table
    console.log('Creating migrations table...');
    await AppDataSource.query(`
      CREATE TABLE "migrations" (
        "id" SERIAL PRIMARY KEY,
        "timestamp" bigint NOT NULL,
        "name" character varying NOT NULL
      )
    `);
    
    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    
    console.log('Migrations completed successfully');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await AppDataSource.destroy();
    process.exit(0);
  }
}

cleanAndRunMigrations();

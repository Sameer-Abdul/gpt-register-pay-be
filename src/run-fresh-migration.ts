import { AppDataSource } from './data-source';

async function runFreshMigration() {
  try {
    // Initialize the data source
    await AppDataSource.initialize();
    
    // Drop all tables in the database
    console.log('Dropping all tables...');
    await AppDataSource.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          -- Disable all triggers to avoid foreign key constraint violations
          SET session_replication_role = 'replica';
          
          -- Drop all tables
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          
          -- Re-enable triggers
          SET session_replication_role = 'origin';
      END $$;
    `);
    
    // Run migrations
    console.log('Running migrations...');
    await AppDataSource.runMigrations();
    
    console.log('Migration completed successfully');
    
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await AppDataSource.destroy();
    process.exit(0);
  }
}

runFreshMigration();

import { DataSource } from 'typeorm';
import { AppDataSource } from './data-source';

async function runMigrations() {
    try {
        console.log('Initializing database connection...');
        const connection = await AppDataSource.initialize();
        console.log('Running migrations...');
        await connection.runMigrations();
        console.log('Migrations completed successfully');
        await connection.destroy();
        process.exit(0);
    } catch (error) {
        console.error('Error running migrations:', error);
        process.exit(1);
    }
}

runMigrations();

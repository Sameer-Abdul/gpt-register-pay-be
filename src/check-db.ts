import { AppDataSource } from './data-source';

async function checkDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Connected to database');

    const result = await AppDataSource.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name IN ('payments', 'register') 
      ORDER BY table_name, ordinal_position;
    `);

    console.log('Database schema:');
    console.table(result);

    // Check if the payment table exists and its columns
    const paymentColumns = await AppDataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'payments';
    `);
    
    console.log('\nPayments table columns:');
    console.table(paymentColumns);

    // Check if the register table exists and its columns
    const registerColumns = await AppDataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'register';
    `);
    
    console.log('\nRegister table columns:');
    console.table(registerColumns);

  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

checkDatabase();

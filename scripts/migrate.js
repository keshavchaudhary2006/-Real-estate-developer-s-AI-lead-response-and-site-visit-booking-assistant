const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

async function runMigration() {
  console.log('====================================================');
  console.log('🐘 Keshav Production Database Migration');
  console.log('====================================================');

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set.');
    console.error('   Please provide a valid PostgreSQL connection string.');
    console.error('   Example: DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres');
    process.exit(1);
  }

  const isCloudDb = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');
  const poolConfig = {
    connectionString,
    ssl: isCloudDb || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  };

  const pool = new Pool(poolConfig);

  try {
    console.log('📡 Connecting to PostgreSQL database...');
    const client = await pool.connect();
    console.log('✅ Connection established successfully.');

    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('🚀 Executing schema DDL migrations (db/schema.sql)...');
    await client.query(schemaSql);
    console.log('✅ Tables and indexes migrated successfully.');

    // Verify created tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\n📋 Verified Public Tables:');
    tablesRes.rows.forEach((row) => console.log(`   - ${row.table_name}`));

    // Check row counts
    const leadsCount = await client.query('SELECT COUNT(*) FROM leads;');
    const factsCount = await client.query('SELECT COUNT(*) FROM fact_sheet;');
    const slotsCount = await client.query('SELECT COUNT(*) FROM visit_slots;');

    console.log('\n📊 Current Row Counts:');
    console.log(`   - leads: ${leadsCount.rows[0].count}`);
    console.log(`   - fact_sheet: ${factsCount.rows[0].count}`);
    console.log(`   - visit_slots: ${slotsCount.rows[0].count}`);

    const shouldSeed = process.argv.includes('--seed') || parseInt(leadsCount.rows[0].count, 10) === 0;
    if (shouldSeed) {
      console.log('\n🌱 Running initial database seed...');
      client.release();
      const db = require('../db');
      await db.initDb();
      await db.seedDb();
      console.log('✅ Database seeded with initial mock data.');
    } else {
      client.release();
    }

    await pool.end();
    console.log('\n====================================================');
    console.log('🎉 Migration completed successfully!');
    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    await pool.end().catch(() => {});
    process.exit(1);
  }
}

runMigration();

#!/usr/bin/env node
/**
 * Initialize SolRelay database using PostgreSQL connection
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Supabase PostgreSQL connection string (session mode)
const connectionString = `postgresql://postgres.drwcenrslcllekubgsbw:${process.env.SUPABASE_DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`;

async function initDatabase() {
  console.log('🔧 Initializing SolRelay database...\n');

  // Read schema file
  const schemaPath = path.join(__dirname, '..', 'supabase-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  // Split into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL\n');

    let success = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ') + '...';
      
      try {
        await client.query(stmt);
        console.log(`✓ [${i + 1}/${statements.length}] ${preview}`);
        success++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭ [${i + 1}/${statements.length}] Already exists: ${preview}`);
          success++;
        } else {
          console.log(`✗ [${i + 1}/${statements.length}] ${error.message.substring(0, 60)}`);
          errors++;
        }
      }
    }

    client.release();
    
    console.log(`\n════════════════════════════════════════`);
    console.log(`✓ Success: ${success}`);
    console.log(`✗ Errors: ${errors}`);
    console.log(`════════════════════════════════════════\n`);

    if (errors === 0) {
      console.log('🎉 Database initialized successfully!');
    } else {
      console.log('⚠️  Some statements failed - check above for details');
    }

  } finally {
    await pool.end();
  }
}

initDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

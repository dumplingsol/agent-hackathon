#!/usr/bin/env node
/**
 * Initialize SolRelay database using Supabase HTTP API
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

async function initDatabase() {
  console.log('🔧 Initializing SolRelay database via HTTP API...\n');

  // Since we can't run arbitrary SQL via REST, we'll create tables one by one
  // using the Supabase client to verify what exists

  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // First, let's check if we can access the database at all
  console.log('Testing connection...');
  
  try {
    const { data, error } = await supabase.from('transfers').select('id').limit(1);
    if (error && !error.message.includes('does not exist')) {
      console.log('✓ Database accessible');
    } else if (!error) {
      console.log('✓ transfers table already exists');
    } else {
      console.log('⚠️  transfers table does not exist - need to create schema');
    }
  } catch (e) {
    console.log('Connection status:', e.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('⚠️  IMPORTANT: Manual SQL execution required');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nSupabase REST API does not allow direct SQL execution.');
  console.log('Please run the schema manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/drwcenrslcllekubgsbw/sql/new');
  console.log('2. Copy contents of: supabase-schema.sql');
  console.log('3. Paste and click "Run"\n');
  
  // Read and display first part of schema
  const schemaPath = path.join(__dirname, '..', 'supabase-schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  
  console.log('Schema preview (first 1000 chars):\n');
  console.log('─'.repeat(60));
  console.log(schema.substring(0, 1000));
  console.log('─'.repeat(60));
  console.log('\n... (see full file: supabase-schema.sql)\n');

  // Try to verify tables after user runs schema
  console.log('\nAfter running the schema, run: node setup-database.js --check');
}

initDatabase().catch(err => {
  console.error('Error:', err.message);
});

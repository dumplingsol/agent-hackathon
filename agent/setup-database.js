#!/usr/bin/env node
/**
 * SolRelay Database Setup
 * 
 * Checks and verifies database tables exist.
 * Run this to verify your setup.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TABLES = [
  'transfers',
  'missions', 
  'events',
  'trigger_rules',
  'email_queue',
  'analytics_daily',
  'blocked_entities',
  'agent_state',
  'policies',
];

async function checkTables() {
  console.log('\n📊 Checking database tables...\n');
  
  let exists = 0;
  let missing = 0;

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error && error.message.includes('does not exist')) {
        console.log(`   ❌ ${table} - MISSING`);
        missing++;
      } else if (error) {
        console.log(`   ⚠️ ${table} - ERROR: ${error.message.substring(0, 40)}`);
        missing++;
      } else {
        console.log(`   ✓ ${table}`);
        exists++;
      }
    } catch (e) {
      console.log(`   ❌ ${table}: ${e.message}`);
      missing++;
    }
  }

  console.log(`\n   Total: ${exists} exist, ${missing} missing`);
  return { exists, missing };
}

async function insertDefaults() {
  console.log('\n📝 Inserting default data...\n');

  // Insert trigger rules
  const triggerRules = [
    {
      name: 'reminder_24h',
      description: 'Send reminder after 24 hours unclaimed',
      condition_type: 'transfer_age',
      condition_params: { min_hours: 24, max_hours: 48, status: 'pending', max_reminders: 0 },
      mission_type: 'send_reminder',
      mission_params: { reminder_type: 'first' },
      cooldown_seconds: 14400,
      auto_approve: true,
      enabled: true
    },
    {
      name: 'reminder_48h',
      description: 'Send urgent reminder after 48 hours',
      condition_type: 'transfer_age',
      condition_params: { min_hours: 48, max_hours: 70, status: 'pending', max_reminders: 1 },
      mission_type: 'send_reminder',
      mission_params: { reminder_type: 'urgent' },
      cooldown_seconds: 14400,
      auto_approve: true,
      enabled: true
    },
    {
      name: 'reminder_expiry',
      description: 'Send final notice 2 hours before expiry',
      condition_type: 'transfer_expiry_soon',
      condition_params: { hours_until_expiry: 2, status: 'pending' },
      mission_type: 'send_reminder',
      mission_params: { reminder_type: 'final' },
      cooldown_seconds: 0,
      auto_approve: true,
      enabled: true
    },
    {
      name: 'auto_reclaim_expired',
      description: 'Auto-reclaim expired transfers',
      condition_type: 'transfer_expired',
      condition_params: { status: 'pending', grace_hours: 0 },
      mission_type: 'auto_reclaim',
      mission_params: {},
      cooldown_seconds: 60,
      auto_approve: true,
      enabled: true
    }
  ];

  const { error: rulesErr } = await supabase
    .from('trigger_rules')
    .upsert(triggerRules, { onConflict: 'name' });
  
  if (rulesErr) {
    console.log('   ❌ Trigger rules:', rulesErr.message.substring(0, 50));
  } else {
    console.log('   ✓ Trigger rules inserted (4 rules)');
  }

  // Insert policies
  const policies = [
    { key: 'email_limits', value: { max_per_transfer: 3, max_per_hour: 100, max_per_day: 1000 } },
    { key: 'auto_approve_rules', value: { allowed_types: ['send_reminder', 'auto_reclaim'] } },
    { key: 'reclaim_settings', value: { enabled: false, max_per_minute: 10 } }
  ];

  const { error: polsErr } = await supabase
    .from('policies')
    .upsert(policies, { onConflict: 'key' });
  
  if (polsErr) {
    console.log('   ❌ Policies:', polsErr.message.substring(0, 50));
  } else {
    console.log('   ✓ Policies inserted (3 policies)');
  }

  // Set initial agent state
  const { error: stateErr } = await supabase
    .from('agent_state')
    .upsert({ key: 'setup', value: { completed_at: new Date().toISOString(), version: '2.0.0' } });
  
  if (stateErr) {
    console.log('   ❌ Agent state:', stateErr.message.substring(0, 50));
  } else {
    console.log('   ✓ Agent state initialized');
  }
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║            SolRelay Database Setup Checker                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const { exists, missing } = await checkTables();

  if (missing > 0) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('⚠️  DATABASE SCHEMA NEEDS TO BE CREATED');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Please run the schema SQL in Supabase:\n');
    console.log('1. Open: https://supabase.com/dashboard/project/drwcenrslcllekubgsbw/sql/new\n');
    console.log('2. Copy contents of: ../supabase-schema.sql\n');
    console.log('3. Paste and click "Run"\n');
    console.log('4. Run this script again to verify\n');
    process.exit(1);
  }

  // Tables exist - insert defaults
  await insertDefaults();

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ DATABASE READY!');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Start the services:\n');
  console.log('  npm run dev        # API server');
  console.log('  npm run dev:agent  # Autonomous agent');
  console.log('\nOr with PM2:');
  console.log('  pm2 start ecosystem.config.js\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

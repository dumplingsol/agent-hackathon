#!/bin/bash
#
# SolRelay Setup Script
#

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║               SolRelay Autonomous System Setup                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Check if npm packages are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Test Supabase connection
echo "🔌 Testing Supabase connection..."
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function test() {
  try {
    const { data, error } = await supabase.from('transfers').select('id').limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log('⚠️  Tables need to be created');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('');
      console.log('Please create the database schema:');
      console.log('');
      console.log('1. Open: https://supabase.com/dashboard/project/kgkruaeqosyuaxfyhngn/sql/new');
      console.log('');
      console.log('2. Copy the SQL from: ../supabase-schema.sql');
      console.log('');
      console.log('3. Paste in the SQL editor and click \"Run\"');
      console.log('');
      console.log('4. Come back and run this script again');
      console.log('');
      console.log('═══════════════════════════════════════════════════════════════');
      process.exit(1);
    } else {
      console.log('✅ Database connected and tables exist!');
      console.log('');
      console.log('Ready to start services:');
      console.log('  npm run dev        # API server (dev mode)');
      console.log('  npm run dev:agent  # Autonomous agent (dev mode)');
      console.log('');
      console.log('Or with PM2:');
      console.log('  pm2 start ecosystem.config.js');
    }
  } catch (e) {
    console.error('❌ Connection error:', e.message);
    process.exit(1);
  }
}

test();
"

echo ""

#!/bin/bash

echo "Testing Agent Service Endpoints..."
echo ""

# Test 1: Health check
echo "1. Testing /health"
curl -s http://localhost:3001/health | python3 -m json.tool
echo ""

# Test 2: Create transfer
echo "2. Testing /api/create-transfer"
curl -s -X POST http://localhost:3001/api/create-transfer \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","amount":25,"token":"USDC"}' | python3 -m json.tool
echo ""

# Test 3: Get transfer (will fail - no transfer exists yet)
echo "3. Testing /api/transfer/:code"
curl -s http://localhost:3001/api/transfer/test123 | python3 -m json.tool
echo ""

echo "✅ Agent service endpoint tests complete!"

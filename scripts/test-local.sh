#!/bin/bash
# Test script for local Solmail development

set -e

echo "=== Solmail Local Test Script ==="
echo ""

# Check if agent is running
echo "1. Checking agent service..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Agent is running"
    curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/health
else
    echo "   ❌ Agent is not running. Starting..."
    cd agent
    npm start &
    sleep 3
    cd ..
fi

echo ""

# Check if web is running
echo "2. Checking web service..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Web is running on port 3000"
else
    echo "   ❌ Web is not running. Starting..."
    cd web
    npm run dev &
    sleep 5
    cd ..
fi

echo ""
echo "3. Testing API endpoints..."

# Test create-transfer
echo "   Testing create-transfer..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/create-transfer \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","amount":1,"token":"USDC","senderPublicKey":"11111111111111111111111111111111"}')

if echo "$RESPONSE" | grep -q "emailHash"; then
    echo "   ✅ create-transfer works"
    CLAIM_CODE=$(echo "$RESPONSE" | grep -o '"claimCode":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$CLAIM_CODE" ]; then
        echo "   📧 Claim code: $CLAIM_CODE"
        
        # Test get transfer
        echo "   Testing get transfer..."
        if curl -s "http://localhost:3001/api/transfer/$CLAIM_CODE" | grep -q "amount"; then
            echo "   ✅ get-transfer works"
        else
            echo "   ❌ get-transfer failed"
        fi
    fi
else
    echo "   ❌ create-transfer failed: $RESPONSE"
fi

echo ""
echo "=== Test Complete ==="
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:3000"
echo "  - Agent API: http://localhost:3001"
echo ""
echo "To test the full flow:"
echo "  1. Open http://localhost:3000"
echo "  2. Connect a Phantom wallet (devnet)"
echo "  3. Get devnet USDC from a faucet"
echo "  4. Send a transfer to any email"
echo "  5. Check the claim link and test claiming"

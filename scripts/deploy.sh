#!/bin/bash
set -e

echo "🚀 PayInbox Deployment Script"
echo "=============================="
echo ""

# Setup environment
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
export PATH="$HOME/.cargo/bin:$PATH"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: Solana CLI not found${NC}"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo -e "${RED}Error: Anchor not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Solana CLI installed${NC}"
echo -e "${GREEN}✓ Anchor installed${NC}"
echo ""

# Check Solana balance
echo -e "${BLUE}Checking Solana balance...${NC}"
BALANCE=$(solana balance | awk '{print $1}')
echo "Balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo -e "${BLUE}Requesting airdrop...${NC}"
    solana airdrop 2 || echo -e "${RED}Airdrop failed (rate limit?). Continue anyway...${NC}"
    sleep 2
fi
echo ""

# Navigate to Anchor workspace
cd program/payinbox || exit 1

# Build the program
echo -e "${BLUE}Building smart contract...${NC}"
anchor build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
echo ""

# Deploy to devnet
echo -e "${BLUE}Deploying to Solana devnet...${NC}"
anchor deploy --provider.cluster devnet

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Deployment successful${NC}"
else
    echo -e "${RED}✗ Deployment failed${NC}"
    exit 1
fi
echo ""

# Extract Program ID
PROGRAM_ID=$(solana address -k target/deploy/payinbox-keypair.json 2>/dev/null || echo "UNKNOWN")

echo ""
echo "================================"
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE!${NC}"
echo "================================"
echo ""
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Next steps:"
echo "1. Update agent/.env with PROGRAM_ID=$PROGRAM_ID"
echo "2. Update web/.env.local with NEXT_PUBLIC_PROGRAM_ID=$PROGRAM_ID"
echo "3. Restart agent service"
echo "4. Test transactions!"
echo ""

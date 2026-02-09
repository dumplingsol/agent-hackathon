#!/bin/bash
set -e

echo "🔧 Initializing Anchor Project"
echo "=============================="
echo ""

# Setup environment
export PATH="$HOME/.cargo/bin:$PATH"

cd ~/clawd/solmail/program

# Initialize Anchor project
echo "Initializing Anchor workspace..."
anchor init payinbox --javascript

# Copy our smart contract code
echo "Copying smart contract code..."
cp lib.rs payinbox/programs/payinbox/src/lib.rs

# Update Cargo.toml
echo "Updating Cargo.toml..."
cat > payinbox/programs/payinbox/Cargo.toml << 'EOF'
[package]
name = "payinbox"
version = "0.1.0"
description = "Send crypto via email - no wallet required"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "payinbox"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
EOF

echo ""
echo "✓ Anchor project initialized!"
echo ""
echo "Project structure:"
echo "  payinbox/"
echo "  ├── programs/payinbox/src/lib.rs  (smart contract)"
echo "  ├── Anchor.toml  (config)"
echo "  └── tests/  (test files)"
echo ""
echo "Next: Run ./deploy.sh to build and deploy"

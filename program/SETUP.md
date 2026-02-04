# Smart Contract Setup

## Prerequisites

Install Solana CLI and Anchor:

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

## Initialize Project

```bash
cd program
anchor init solmail --javascript
```

## Build & Test

```bash
anchor build
anchor test
```

## Deploy to Devnet

```bash
anchor deploy --provider.cluster devnet
```

---

**Note:** Smart contract code will be written manually until Anchor is installed.

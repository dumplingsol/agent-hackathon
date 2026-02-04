# Solmail PayInbox - Quick Start Guide

## 🎉 Deployment Complete!

Your Solmail PayInbox program is now live on Solana Devnet!

**Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`

## What Just Happened?

✅ Fixed blake3 edition2024 compatibility issue  
✅ Updated hash function to use Keccak256  
✅ Built the Anchor program successfully  
✅ Deployed to Solana Devnet  
✅ Verified the deployment on-chain  
✅ Updated all config files with new program ID  

## Quick Links

- **Explorer:** https://explorer.solana.com/address/14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h?cluster=devnet
- **Deployment Details:** See `DEPLOYMENT.md`
- **IDL Location:** `target/idl/solmail.json`
- **Program Binary:** `target/deploy/payinbox.so`

## Using the Program

### Available Instructions

1. **createTransfer** - Create a new email-to-crypto transfer
   ```
   Args: emailHash (32 bytes), claimCodeHash (32 bytes), amount (u64), expirySeconds (i64)
   ```

2. **claimTransfer** - Claim a transfer with the secret code
   ```
   Args: claimCode (String, max 256 chars)
   ```

3. **cancelTransfer** - Cancel a pending transfer (sender only)
   ```
   Args: None
   ```

4. **reclaimExpired** - Reclaim funds from an expired transfer
   ```
   Args: None
   ```

### Important: Hash Function Change

⚠️ **The program now uses Keccak256 instead of SHA256**

When creating transfers, claim codes must be hashed using Keccak256:

**JavaScript/TypeScript:**
```javascript
import { keccak_256 } from '@noble/hashes/sha3';

const claimCode = "your-secret-code";
const claimCodeHash = Buffer.from(keccak_256(claimCode));
```

**Rust:**
```rust
use solana_keccak_hasher::keccak;

let claim_code = "your-secret-code";
let claim_code_hash = keccak::hash(claim_code.as_bytes()).to_bytes();
```

## Testing

### Connect to Devnet
```bash
solana config set --url devnet
```

### Check Program
```bash
solana program show 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h
```

### Run Tests (placeholder - needs update)
```bash
anchor test --skip-local-validator
```

## Development Workflow

### Rebuild After Changes
```bash
anchor build
```

### Redeploy to Devnet
```bash
anchor deploy
```

### Upgrade Program (if needed)
```bash
anchor upgrade target/deploy/payinbox.so --program-id 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h
```

## Project Structure

```
payinbox/
├── Anchor.toml              # Anchor configuration (updated with new program ID)
├── Cargo.toml               # Workspace config (has blake3 patch)
├── programs/
│   └── payinbox/
│       ├── Cargo.toml       # Program dependencies (has solana-keccak-hasher)
│       └── src/
│           └── lib.rs       # Main program code (updated with new ID)
├── target/
│   ├── deploy/
│   │   └── payinbox.so      # Compiled program binary
│   └── idl/
│       └── solmail.json     # Interface Definition Language file
├── tests/
│   └── payinbox.js          # Test file (needs updating)
├── DEPLOYMENT.md            # Detailed deployment info
└── QUICKSTART.md            # This file
```

## Next Steps

1. **Update Tests:** Modify `tests/payinbox.js` with actual program methods
2. **Build Client:** Use the IDL to generate TypeScript/JavaScript client
3. **Security Audit:** Review security features before mainnet
4. **Frontend Integration:** Connect your UI to the program
5. **Mainnet Deployment:** Deploy to production when ready

## Need Help?

- Check `DEPLOYMENT.md` for technical details
- Review the program code in `programs/payinbox/src/lib.rs`
- View the IDL structure in `target/idl/solmail.json`
- Test on devnet before mainnet deployment

## Resources

- Anchor Documentation: https://www.anchor-lang.com/
- Solana Cookbook: https://solanacookbook.com/
- SPL Token Guide: https://spl.solana.com/token

---

**Congratulations! Your email-to-crypto transfer program is live! 🚀**

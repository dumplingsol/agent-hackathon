# Solrelay (PayInbox) Deployment Summary

## ✅ Deployment Status: SUCCESS

**Deployment Date:** 2026-02-04  
**Network:** Devnet  
**Program ID:** `14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h`  

## Program Details

- **Owner:** BPFLoaderUpgradeab1e11111111111111111111111
- **ProgramData Address:** DerXnVWmKXigXtqmSWaRr4Av6WEVg6mTNLdmGiEC1NUs
- **Authority:** FFum4P5rTBkxcFn9vTGrEVe3RsuMF24u1PWYLpTUfUSD
- **Deployed Slot:** 439903223
- **Program Size:** 324,744 bytes (317 KB)
- **Balance:** 2.26142232 SOL

## Build Configuration

### Dependencies Fixed
- **Issue:** blake3 v1.8.3+ requires edition2024 (Rust 2024 edition) which wasn't supported by Solana's cargo-build-sbf (uses Cargo 1.84)
- **Solution:** Added `[patch.crates-io]` section to workspace Cargo.toml to use blake3 1.5.5 from git tag
- **Patch Applied:**
  ```toml
  [patch.crates-io]
  blake3 = { git = "https://github.com/BLAKE3-team/BLAKE3", tag = "1.5.5" }
  ```

### Hash Function Update
- **Issue:** `solana_program::hash` module was moved/restructured in solana-program 2.x
- **Solution:** Added `solana-keccak-hasher = "2.2"` as a direct dependency
- **Change:** Updated claim code hashing from SHA256 to Keccak256
  - Updated code: `use solana_keccak_hasher as keccak;`
  - Updated comments to reflect Keccak256 usage

### Anchor Configuration
- **Anchor Version:** 0.32.0
- **anchor-lang:** 0.32.0
- **anchor-spl:** 0.32.0
- **Toolchain:** Rust 1.93.0, Cargo 1.93.0 (system), Cargo 1.84.0 (cargo-build-sbf)

## Files Updated

1. **programs/payinbox/src/lib.rs**
   - Updated `declare_id!` to new program ID
   - Changed hash import to use `solana_keccak_hasher`
   - Updated hash function call to `keccak::hash()`

2. **Anchor.toml**
   - Updated program ID for both localnet and devnet

3. **Cargo.toml** (workspace root)
   - Added `[patch.crates-io]` section for blake3

4. **programs/payinbox/Cargo.toml**
   - Added `solana-keccak-hasher = "2.2"` dependency

## Program Features

The deployed program supports:
- ✅ Create email-to-crypto transfers with escrow
- ✅ Claim transfers with secret codes (Keccak256 hashed)
- ✅ Cancel pending transfers (sender only)
- ✅ Reclaim expired transfers
- ✅ Constant-time claim code verification
- ✅ 7-day maximum expiry, 1-hour minimum
- ✅ SPL token support via anchor-spl

## Next Steps

### For Testing
1. Update test file (`tests/payinbox.js`) with actual program methods:
   - `createTransfer(emailHash, claimCodeHash, amount, expirySeconds)`
   - `claimTransfer(claimCode)`
   - `cancelTransfer()`
   - `reclaimExpired()`

2. Create integration tests using the devnet deployment

### For Production
1. Audit security features (claim code hashing, constant-time comparison)
2. Test with various SPL tokens
3. Deploy to mainnet-beta when ready
4. Update frontend/client code to use Keccak256 for claim code hashing

## Verification

You can verify the deployment on Solana Explorer:
- Devnet: `https://explorer.solana.com/address/14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h?cluster=devnet`

Or check via CLI:
```bash
solana program show 14bVLKMUaYx9qL8NPNvhEJS4qtemH8hGZSDyF5qjXS8h --url devnet
```

## Important Notes

⚠️ **Client Code Update Required**: Any client code that creates transfers must use Keccak256 to hash claim codes (changed from SHA256 to Keccak256 due to API availability).

Example (JavaScript):
```javascript
import { keccak_256 } from '@noble/hashes/sha3';

const claimCode = "secret-claim-code";
const claimCodeHash = Buffer.from(keccak_256(claimCode));
```

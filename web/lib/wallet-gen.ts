import { Keypair } from '@solana/web3.js'

/**
 * Generate a new Solana wallet client-side
 * Returns keypair and mnemonic phrase
 * 
 * NOTE: In production, we'd use BIP39 for proper mnemonic generation
 * For MVP, generating a random keypair
 */
export function generateWallet(): { 
  keypair: Keypair
  publicKey: string
  secretKey: Uint8Array
  mnemonic: string[]  // Placeholder - would use BIP39 in production
} {
  const keypair = Keypair.generate()
  
  // In production: use bip39.generateMnemonic() and derive keypair from it
  // For MVP: generate random "mnemonic-like" words as placeholder
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent',
    'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'
  ]
  
  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    secretKey: keypair.secretKey,
    mnemonic: words  // Placeholder
  }
}

/**
 * TODO: Add BIP39 support
 * npm install bip39 @scure/bip39 @scure/bip32
 * 
 * import * as bip39 from 'bip39'
 * import { derivePath } from 'ed25519-hd-key'
 * 
 * const mnemonic = bip39.generateMnemonic()
 * const seed = bip39.mnemonicToSeedSync(mnemonic)
 * const derivedSeed = derivePath("m/44'/501'/0'/0'", seed.toString('hex')).key
 * const keypair = Keypair.fromSeed(derivedSeed)
 */

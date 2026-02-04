'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction } from '@solana/web3.js';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { getTransfer, getClaimData, submitClaim, TransferDetails } from '@/lib/api';
import { generateWallet, formatPublicKey, GeneratedWallet } from '@/lib/wallet-gen';
import { getTransferPDA, buildClaimTransferTx } from '@/lib/program';

type ClaimMethod = 'connect' | 'generate' | null;
type PageState = 'loading' | 'error' | 'ready' | 'claiming' | 'claimed';

export default function ClaimPage() {
  const params = useParams();
  const code = params?.code as string;
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [transfer, setTransfer] = useState<TransferDetails | null>(null);
  const [error, setError] = useState('');
  const [claimMethod, setClaimMethod] = useState<ClaimMethod>(null);
  const [generatedWallet, setGeneratedWallet] = useState<GeneratedWallet | null>(null);
  const [savedMnemonic, setSavedMnemonic] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [txSignature, setTxSignature] = useState('');

  // Load transfer details
  useEffect(() => {
    if (!code) {
      setError('Invalid claim link');
      setPageState('error');
      return;
    }

    loadTransfer();
  }, [code]);

  const loadTransfer = async () => {
    try {
      setPageState('loading');
      const data = await getTransfer(code);

      if (data.claimed) {
        setError('This transfer has already been claimed');
        setPageState('error');
        return;
      }

      if (data.expired) {
        setError('This transfer has expired');
        setPageState('error');
        return;
      }

      setTransfer(data);
      setPageState('ready');
    } catch (err) {
      console.error('Error loading transfer:', err);
      setError(err instanceof Error ? err.message : 'Transfer not found or expired');
      setPageState('error');
    }
  };

  // Handle wallet generation
  const handleGenerateWallet = useCallback(() => {
    const wallet = generateWallet();
    setGeneratedWallet(wallet);
    setRecipientAddress(wallet.publicKey);
  }, []);

  // Handle claim submission
  const handleClaim = async () => {
    if (!transfer) return;

    const recipient = claimMethod === 'connect' ? publicKey?.toBase58() : recipientAddress;
    if (!recipient) {
      toast.error('Please connect or generate a wallet first');
      return;
    }

    setPageState('claiming');
    const toastId = toast.loading('Preparing claim transaction...');

    try {
      // Get claim data from agent
      toast.loading('Getting claim data...', { id: toastId });
      const claimData = await getClaimData(code);

      if (!claimData.sender || !claimData.emailHash || !claimData.tokenMint) {
        throw new Error('Invalid claim data received from server');
      }

      // Derive the transfer PDA
      const senderPubkey = new PublicKey(claimData.sender);
      const emailHashArray = new Uint8Array(claimData.emailHash);
      const [transferPDA] = getTransferPDA(senderPubkey, emailHashArray);
      const tokenMint = new PublicKey(claimData.tokenMint);
      const recipientPubkey = new PublicKey(recipient);

      // Build the claim transaction
      toast.loading('Building transaction...', { id: toastId });
      const transaction = await buildClaimTransferTx(
        connection,
        recipientPubkey,
        transferPDA,
        claimData.claimCode,
        senderPubkey,
        tokenMint
      );

      // Sign the transaction
      toast.loading('Signing transaction...', { id: toastId });
      let signedTx: Transaction;

      if (claimMethod === 'connect' && signTransaction) {
        // Sign with connected wallet
        signedTx = await signTransaction(transaction);
      } else if (generatedWallet) {
        // Sign with generated keypair
        transaction.partialSign(generatedWallet.keypair);
        signedTx = transaction;
      } else {
        throw new Error('No wallet available to sign transaction');
      }

      // Send the transaction
      toast.loading('Sending transaction...', { id: toastId });
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm the transaction
      toast.loading('Confirming transaction...', { id: toastId });
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: transaction.recentBlockhash!,
          lastValidBlockHeight: transaction.lastValidBlockHeight!,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Report success to agent
      toast.loading('Finalizing...', { id: toastId });
      await submitClaim(code, signature, recipient);

      setTxSignature(signature);
      setPageState('claimed');
      toast.success('Funds claimed successfully! 🎉', { id: toastId });
    } catch (err) {
      console.error('Claim error:', err);
      setPageState('ready');
      
      let errorMsg = 'Failed to claim funds';
      if (err instanceof Error) {
        if (err.message.includes('User rejected')) {
          errorMsg = 'Transaction cancelled by user';
        } else if (err.message.includes('InvalidClaimCode') || err.message.includes('0x1770')) {
          errorMsg = 'Invalid claim code - the link may be expired or already used';
        } else if (err.message.includes('TransferExpired') || err.message.includes('0x1772')) {
          errorMsg = 'This transfer has expired';
        } else if (err.message.includes('already been claimed') || err.message.includes('0x1773')) {
          errorMsg = 'This transfer has already been claimed';
        } else if (err.message.includes('0x1')) {
          errorMsg = 'Insufficient SOL for transaction fees';
        } else {
          errorMsg = err.message;
        }
      }
      
      toast.error(errorMsg, { id: toastId });
    }
  };

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!transfer?.expiresAt) return null;
    const expiry = new Date(transfer.expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen bg-white dark:bg-[#0d1225]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-solana-purple border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading transfer details...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <main className="min-h-screen bg-white dark:bg-[#0d1225]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2 dark:text-white">Transfer Not Available</h1>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </div>
      </main>
    );
  }

  // Claimed state
  if (pageState === 'claimed') {
    return (
      <main className="min-h-screen bg-white dark:bg-[#0d1225]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4 dark:text-white">Funds Claimed!</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            {transfer?.amount} {transfer?.token} has been sent to your wallet
          </p>

          {txSignature && (
            <div className="bg-gray-100 dark:bg-[#1a1f3a] rounded-lg p-4 mb-6 inline-block">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Transaction</p>
              <a
                href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-solana-purple hover:underline font-mono text-sm"
              >
                View on Solana Explorer →
              </a>
            </div>
          )}

          <div className="bg-gray-100 dark:bg-[#1a1f3a] rounded-lg p-4 inline-block">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Recipient wallet</p>
            <p className="font-mono text-gray-800 dark:text-white">
              {formatPublicKey(recipientAddress || publicKey?.toBase58() || '', 8)}
            </p>
          </div>

          {generatedWallet && (
            <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-left max-w-md mx-auto">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                ⚠️ Important: Save Your Recovery Phrase
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                You&apos;ll need these 12 words to access your wallet later. Keep them safe and private!
              </p>
              <div className="bg-white dark:bg-[#0d1225] rounded p-3 font-mono text-sm text-gray-800 dark:text-gray-200">
                {generatedWallet.mnemonic.join(' ')}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // Ready state - show claim options
  return (
    <main className="min-h-screen bg-white dark:bg-[#0d1225]">
      <Header />

      <section className="max-w-2xl mx-auto px-4 py-12 md:py-20">
        {/* Transfer Info */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-solana-gradient rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💰</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 dark:text-white">
            You&apos;ve received {transfer?.amount} {transfer?.token}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            From: <span className="font-mono">{formatPublicKey(transfer?.sender || '', 6)}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {getTimeRemaining()}
          </p>
        </div>

        {/* Network notice */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-3 mb-6 text-center">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            ⚠️ This is on Solana Devnet - test tokens only
          </p>
        </div>

        {/* Claim Method Selection */}
        {!claimMethod ? (
          <div className="bg-white dark:bg-[#1a1f3a] border border-gray-200 dark:border-[#1d2646] rounded-2xl p-6 md:p-8 shadow-lg space-y-4">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-center dark:text-white">
              Choose how to claim
            </h2>

            <button
              onClick={() => setClaimMethod('connect')}
              className="w-full p-5 md:p-6 border-2 border-gray-200 dark:border-[#1d2646] rounded-xl hover:border-solana-purple dark:hover:border-solana-purple transition text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1 dark:text-white group-hover:text-solana-purple transition">
                    Connect existing wallet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                    Use Phantom, Solflare, or another Solana wallet
                  </p>
                </div>
                <span className="text-2xl text-gray-400 group-hover:text-solana-purple transition">→</span>
              </div>
            </button>

            <button
              onClick={() => {
                setClaimMethod('generate');
                handleGenerateWallet();
              }}
              className="w-full p-5 md:p-6 border-2 border-gray-200 dark:border-[#1d2646] rounded-xl hover:border-solana-purple dark:hover:border-solana-purple transition text-left group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1 dark:text-white group-hover:text-solana-purple transition">
                    Create new wallet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                    New to crypto? We&apos;ll create a wallet for you
                  </p>
                </div>
                <span className="text-2xl text-gray-400 group-hover:text-solana-purple transition">→</span>
              </div>
            </button>
          </div>
        ) : claimMethod === 'connect' ? (
          /* Connect Wallet Flow */
          <div className="bg-white dark:bg-[#1a1f3a] border border-gray-200 dark:border-[#1d2646] rounded-2xl p-6 md:p-8 shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-center dark:text-white">
              Connect Your Wallet
            </h2>

            {!connected ? (
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Connect your Solana wallet to receive the funds.
                </p>
                <WalletMultiButton className="!mx-auto" />
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-700 dark:text-green-300 mb-1">Wallet connected</p>
                  <p className="font-mono text-green-800 dark:text-green-200">
                    {formatPublicKey(publicKey?.toBase58() || '', 8)}
                  </p>
                </div>

                <button
                  onClick={handleClaim}
                  disabled={pageState === 'claiming'}
                  className="px-8 py-4 bg-solana-gradient text-white rounded-lg font-semibold text-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {pageState === 'claiming' ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Claiming...
                    </span>
                  ) : (
                    `Claim ${transfer?.amount} ${transfer?.token}`
                  )}
                </button>
              </div>
            )}

            <button
              onClick={() => setClaimMethod(null)}
              className="block mx-auto mt-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              ← Back
            </button>
          </div>
        ) : (
          /* Generate Wallet Flow */
          <div className="bg-white dark:bg-[#1a1f3a] border border-gray-200 dark:border-[#1d2646] rounded-2xl p-6 md:p-8 shadow-lg">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-center dark:text-white">
              Your New Wallet
            </h2>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Save these 12 words!</strong> They&apos;re the only way to access your wallet later.
                  Write them down and store them safely.
                </p>
              </div>
            </div>

            {generatedWallet && (
              <>
                <div className="bg-gray-100 dark:bg-[#0d1225] rounded-lg p-4 md:p-6 mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
                    Your recovery phrase:
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {generatedWallet.mnemonic.map((word, i) => (
                      <div
                        key={i}
                        className="bg-white dark:bg-[#1a1f3a] border border-gray-200 dark:border-[#1d2646] rounded px-2 py-1.5 text-center font-mono text-sm dark:text-white"
                      >
                        <span className="text-gray-400 text-xs mr-1">{i + 1}.</span>
                        {word}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#0d1225] rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your wallet address:</p>
                  <p className="font-mono text-sm break-all dark:text-white">{generatedWallet.publicKey}</p>
                </div>
              </>
            )}

            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={savedMnemonic}
                onChange={(e) => setSavedMnemonic(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-solana-purple focus:ring-solana-purple"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                I&apos;ve saved my recovery phrase in a safe place and understand that losing it means losing access to my funds.
              </span>
            </label>

            <button
              onClick={handleClaim}
              disabled={!savedMnemonic || pageState === 'claiming'}
              className="w-full py-4 bg-solana-gradient text-white rounded-lg font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pageState === 'claiming' ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Claiming...
                </span>
              ) : (
                `Claim ${transfer?.amount} ${transfer?.token}`
              )}
            </button>

            <button
              onClick={() => {
                setClaimMethod(null);
                setGeneratedWallet(null);
                setSavedMnemonic(false);
              }}
              className="block mx-auto mt-6 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              ← Back
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import { createTransfer, confirmTransfer } from '@/lib/api';
import {
  buildCreateTransferTx,
  TOKEN_MINTS,
  TOKEN_DECIMALS,
  checkBalance,
  TokenType,
} from '@/lib/program';

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Supported tokens
const TOKENS = {
  USDC: { name: 'USDC', decimals: 6, minAmount: 0.01 },
  SOL: { name: 'SOL', decimals: 9, minAmount: 0.001 },
} as const;

interface FormErrors {
  email?: string;
  amount?: string;
}

export default function SendForm() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();

  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<TokenType>('USDC');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [claimLink, setClaimLink] = useState('');
  const [txSignature, setTxSignature] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Validate form inputs
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    } else if (email.length > 254) {
      newErrors.email = 'Email is too long';
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (amountNum < TOKENS[token].minAmount) {
      newErrors.amount = `Minimum amount is ${TOKENS[token].minAmount} ${token}`;
    } else if (amountNum > 1_000_000) {
      newErrors.amount = 'Amount exceeds maximum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, amount, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If wallet not connected, open wallet modal
    if (!connected) {
      setVisible(true);
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Preparing transfer...');

    try {
      const amountNum = parseFloat(amount);

      // Step 1: Check balance
      toast.loading('Checking balance...', { id: toastId });
      const { sufficient, balance } = await checkBalance(
        connection,
        publicKey,
        TOKEN_MINTS[token],
        amountNum,
        TOKEN_DECIMALS[token]
      );

      if (!sufficient) {
        throw new Error(
          `Insufficient ${token} balance. You have ${balance.toFixed(4)} ${token}, need ${amountNum} ${token}`
        );
      }

      // Step 2: Create transfer with agent (get hashes)
      toast.loading('Creating transfer...', { id: toastId });
      const transferData = await createTransfer({
        email: email.trim().toLowerCase(),
        amount: amountNum,
        token,
        senderPublicKey: publicKey.toBase58(),
      });

      // Convert hash arrays to Uint8Array
      const emailHashArray = new Uint8Array(transferData.emailHash);
      const claimCodeHashArray = new Uint8Array(transferData.claimCodeHash);

      // Step 3: Build on-chain transaction
      toast.loading('Building transaction...', { id: toastId });
      const { transaction, transferPDA } = await buildCreateTransferTx(
        connection,
        publicKey,
        emailHashArray,
        claimCodeHashArray,
        amountNum,
        token,
        72 // 72 hours expiry
      );

      // Step 4: Sign transaction
      toast.loading('Waiting for wallet signature...', { id: toastId });
      const signed = await signTransaction(transaction);

      // Step 5: Send transaction
      toast.loading('Sending transaction...', { id: toastId });
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Step 6: Confirm transaction
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

      // Step 7: Confirm with agent (only if we have a claim code, i.e. dev mode)
      if (transferData.claimCode) {
        toast.loading('Finalizing...', { id: toastId });
        await confirmTransfer(
          transferData.claimCode,
          signature,
          transferPDA.toBase58()
        );
      }

      // Success!
      const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin;
      if (transferData.claimCode) {
        setClaimLink(`${frontendUrl}/claim/${transferData.claimCode}`);
      }
      setTxSignature(signature);
      setSuccess(true);
      toast.success('Transfer sent! Recipient will receive claim link via email 🎉', { id: toastId });

    } catch (error: unknown) {
      console.error('Transfer error:', error);
      
      let errorMsg = 'Failed to create transfer';
      if (error instanceof Error) {
        if (error.message.includes('User rejected')) {
          errorMsg = 'Transaction cancelled by user';
        } else if (error.message.includes('Insufficient')) {
          errorMsg = error.message;
        } else if (error.message.includes('0x1')) {
          errorMsg = 'Insufficient SOL for transaction fees';
        } else {
          errorMsg = error.message;
        }
      }
      
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setEmail('');
    setAmount('');
    setErrors({});
    setClaimLink('');
    setTxSignature('');
  };

  // Success state
  if (success) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h3 className="text-2xl font-bold mb-2 dark:text-white">Transfer Created!</h3>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          An email has been sent to <strong className="text-gray-800 dark:text-white">{email}</strong> with
          instructions to claim their funds.
        </p>

        {txSignature && (
          <div className="bg-white dark:bg-[#0d1225] border border-gray-200 dark:border-[#1d2646] rounded-lg p-4 mb-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Transaction Signature</p>
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm break-all text-solana-purple hover:underline"
            >
              {txSignature.slice(0, 20)}...{txSignature.slice(-20)}
            </a>
          </div>
        )}

        {claimLink && (
          <div className="bg-white dark:bg-[#0d1225] border border-gray-200 dark:border-[#1d2646] rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Claim Link (for testing)</p>
            <code className="text-sm break-all text-gray-800 dark:text-gray-200">{claimLink}</code>
          </div>
        )}

        <button
          onClick={handleReset}
          className="text-solana-purple hover:underline font-medium"
        >
          Send another transfer
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-[#1a1f3a] border border-gray-200 dark:border-[#1d2646] rounded-2xl p-8 shadow-lg">
      {/* Email Input */}
      <div className="mb-6">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Recipient Email
        </label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors({ ...errors, email: undefined });
          }}
          placeholder="friend@example.com"
          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent outline-none transition
            ${errors.email
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-[#1d2646]'
            }
            dark:bg-[#0d1225] dark:text-white`}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.email}
          </p>
        )}
      </div>

      {/* Amount & Token */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              if (errors.amount) setErrors({ ...errors, amount: undefined });
            }}
            placeholder="0.00"
            step="any"
            min="0"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent outline-none transition
              ${errors.amount
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-[#1d2646]'
              }
              dark:bg-[#0d1225] dark:text-white`}
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? 'amount-error' : undefined}
          />
          {errors.amount && (
            <p id="amount-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Token
          </label>
          <select
            id="token"
            value={token}
            onChange={(e) => setToken(e.target.value as TokenType)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-[#1d2646] dark:bg-[#0d1225] dark:text-white rounded-lg focus:ring-2 focus:ring-solana-purple focus:border-transparent outline-none transition bg-white cursor-pointer"
          >
            {Object.entries(TOKENS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-4 bg-solana-gradient text-white rounded-lg font-semibold text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </span>
        ) : !connected ? (
          'Connect Wallet to Send'
        ) : (
          'Send via Email'
        )}
      </button>

      {/* Info Text */}
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
        Recipient will receive an email with a link to claim.
        <br />
        Expires in 72 hours if unclaimed.
      </p>

      {/* Network notice */}
      <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-2">
        ⚠️ Running on Solana Devnet - use test tokens only
      </p>
    </form>
  );
}

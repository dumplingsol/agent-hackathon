'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import {
  fetchAllTransfersForSender,
  buildCancelTransferTx,
  ParsedTransfer,
  TransferStatus,
  TOKEN_MINTS,
} from '@/lib/program';

// Refresh interval for transfer list (30 seconds)
const REFRESH_INTERVAL = 30000;

export default function TransferHistory() {
  const { publicKey, signTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const [transfers, setTransfers] = useState<ParsedTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch transfers
  const fetchTransfers = useCallback(async () => {
    if (!publicKey) {
      setTransfers([]);
      return;
    }

    setLoading(true);
    try {
      const allTransfers = await fetchAllTransfersForSender(connection, publicKey);
      setTransfers(allTransfers);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connection]);

  // Initial fetch and refresh interval
  useEffect(() => {
    if (connected && publicKey) {
      fetchTransfers();
      const interval = setInterval(fetchTransfers, REFRESH_INTERVAL);
      return () => clearInterval(interval);
    } else {
      setTransfers([]);
    }
  }, [connected, publicKey, fetchTransfers]);

  // Handle cancel transfer
  const handleCancel = async (transfer: ParsedTransfer) => {
    if (!publicKey || !signTransaction) return;

    setCancellingId(transfer.publicKey.toBase58());
    const toastId = toast.loading('Cancelling transfer...');

    try {
      // Build cancel transaction
      const transaction = await buildCancelTransferTx(
        connection,
        publicKey,
        transfer.publicKey,
        transfer.data
      );

      // Sign
      toast.loading('Waiting for wallet signature...', { id: toastId });
      const signed = await signTransaction(transaction);

      // Send
      toast.loading('Sending transaction...', { id: toastId });
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm
      toast.loading('Confirming...', { id: toastId });
      await connection.confirmTransaction(
        {
          signature,
          blockhash: transaction.recentBlockhash!,
          lastValidBlockHeight: transaction.lastValidBlockHeight!,
        },
        'confirmed'
      );

      toast.success(
        `Transfer cancelled! ${transfer.amountFormatted} ${transfer.tokenSymbol} refunded.`,
        { id: toastId }
      );

      // Refresh the list
      await fetchTransfers();
    } catch (error: unknown) {
      console.error('Cancel error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to cancel transfer';
      if (errorMsg.includes('User rejected')) {
        toast.error('Transaction cancelled by user', { id: toastId });
      } else {
        toast.error(errorMsg, { id: toastId });
      }
    } finally {
      setCancellingId(null);
    }
  };

  // Separate active and completed transfers
  const activeTransfers = transfers.filter((t) => t.data.status === TransferStatus.Active);
  const completedTransfers = transfers.filter((t) => t.data.status !== TransferStatus.Active);

  // Don't render if not connected or no transfers
  if (!connected || !publicKey) {
    return null;
  }

  const hasTransfers = transfers.length > 0;

  return (
    <div className="mt-12 w-full">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#1a1f3a] border border-gray-200 dark:border-[#1d2646] rounded-xl hover:bg-gray-50 dark:hover:bg-[#1d2440] transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-solana-purple/10 rounded-lg">
            <svg
              className="w-5 h-5 text-solana-purple"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold dark:text-white">Your Transfers</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? (
                'Loading...'
              ) : hasTransfers ? (
                <>
                  {activeTransfers.length} active · {completedTransfers.length} completed
                </>
              ) : (
                'No transfers yet'
              )}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-4 space-y-6">
          {loading && transfers.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-solana-purple border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading transfers...</p>
            </div>
          ) : !hasTransfers ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-[#0d1225] rounded-xl border border-gray-200 dark:border-[#1d2646]">
              <p className="text-gray-500 dark:text-gray-400">
                No transfers yet. Send your first transfer above!
              </p>
            </div>
          ) : (
            <>
              {/* Active Transfers */}
              {activeTransfers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    In Progress ({activeTransfers.length})
                  </h4>
                  <div className="space-y-3">
                    {activeTransfers.map((transfer) => (
                      <TransferCard
                        key={transfer.publicKey.toBase58()}
                        transfer={transfer}
                        onCancel={() => handleCancel(transfer)}
                        isCancelling={cancellingId === transfer.publicKey.toBase58()}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Transfers */}
              {completedTransfers.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                    Completed ({completedTransfers.length})
                  </h4>
                  <div className="space-y-3">
                    {completedTransfers.map((transfer) => (
                      <TransferCard
                        key={transfer.publicKey.toBase58()}
                        transfer={transfer}
                        isCompleted
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Refresh Button */}
          {hasTransfers && (
            <div className="text-center">
              <button
                onClick={fetchTransfers}
                disabled={loading}
                className="text-sm text-solana-purple hover:underline disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh transfers'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TransferCardProps {
  transfer: ParsedTransfer;
  onCancel?: () => void;
  isCancelling?: boolean;
  isCompleted?: boolean;
}

function TransferCard({ transfer, onCancel, isCancelling, isCompleted }: TransferCardProps) {
  const statusConfig = {
    [TransferStatus.Active]: {
      label: transfer.isExpired ? 'Expired' : 'Pending',
      color: transfer.isExpired
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
    [TransferStatus.Claimed]: {
      label: 'Claimed',
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    [TransferStatus.Cancelled]: {
      label: 'Cancelled',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
    },
    [TransferStatus.Expired]: {
      label: 'Reclaimed',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
  };

  const status = statusConfig[transfer.data.status] || statusConfig[TransferStatus.Active];

  // Format email hash as shortened hex for display (we don't have the actual email)
  const emailHashHex = Buffer.from(transfer.data.emailHash).toString('hex');
  const shortenedHash = `${emailHashHex.slice(0, 8)}...${emailHashHex.slice(-6)}`;

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatTimeUntil = (date: Date): string => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h left`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m left`;
    return `${diffMins}m left`;
  };

  return (
    <div className="bg-white dark:bg-[#1a1f3a] border border-gray-200 dark:border-[#1d2646] rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        {/* Left side - Transfer details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {/* Token icon */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                transfer.tokenSymbol === 'SOL'
                  ? 'bg-gradient-to-r from-purple-500 to-teal-400 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {transfer.tokenSymbol === 'SOL' ? '◎' : '$'}
            </div>
            <div>
              <p className="font-semibold dark:text-white">
                {transfer.amountFormatted} {transfer.tokenSymbol}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                To: {shortenedHash}
              </p>
            </div>
          </div>

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Sent {formatTimeAgo(transfer.createdDate)}</span>
            {!isCompleted && transfer.data.status === TransferStatus.Active && (
              <span
                className={transfer.isExpired ? 'text-red-500 dark:text-red-400' : ''}
              >
                {formatTimeUntil(transfer.expiryDate)}
              </span>
            )}
          </div>
        </div>

        {/* Right side - Status and actions */}
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>

          {/* Action buttons for active transfers */}
          {!isCompleted && transfer.data.status === TransferStatus.Active && (
            <div className="flex gap-2">
              <a
                href={`https://explorer.solana.com/address/${transfer.publicKey.toBase58()}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                title="View on Explorer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              <button
                onClick={onCancel}
                disabled={isCancelling}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg text-xs font-medium transition disabled:opacity-50"
              >
                {isCancelling ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Cancelling
                  </span>
                ) : (
                  'Cancel'
                )}
              </button>
            </div>
          )}

          {/* View on explorer for completed */}
          {isCompleted && (
            <a
              href={`https://explorer.solana.com/address/${transfer.publicKey.toBase58()}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-solana-purple hover:underline"
            >
              View on Explorer
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

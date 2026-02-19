'use client';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'AgentStack',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [base, baseSepolia],
  ssr: true,
});

// ─── TOKEN CONFIG ────────────────────────────────────────────────────────────
// Using USDC on Base as the placeholder until $STACK launches.
// To switch to $STACK: set NEXT_PUBLIC_STACK_TOKEN_ADDRESS in .env.local
// and update STACK_TOKEN_SYMBOL / STACK_TOKEN_DECIMALS if needed.
//
// Current placeholder: USDC on Base mainnet
// Address: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
// Decimals: 6
//
// When $STACK is live, just do:
//   NEXT_PUBLIC_STACK_TOKEN_ADDRESS=0xYourSTACKAddress
//   NEXT_PUBLIC_STACK_TOKEN_DECIMALS=18   # (or whatever STACK uses)
//   NEXT_PUBLIC_STACK_TOKEN_SYMBOL=STACK

export const STACK_TOKEN_ADDRESS = (
  process.env.NEXT_PUBLIC_STACK_TOKEN_ADDRESS ||
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base — placeholder
) as `0x${string}`;

export const STACK_TOKEN_DECIMALS = parseInt(
  process.env.NEXT_PUBLIC_STACK_TOKEN_DECIMALS || '6'
);

export const STACK_TOKEN_SYMBOL =
  process.env.NEXT_PUBLIC_STACK_TOKEN_SYMBOL || 'USDC';

// Platform escrow wallet — receives task rewards on behalf of the platform.
// When a winner is determined on-chain this address disperses / burns.
// Set via env so you can use a multisig or burn address later.
export const ESCROW_ADDRESS = (
  process.env.NEXT_PUBLIC_ESCROW_ADDRESS ||
  '0x000000000000000000000000000000000000dEaD' // default: burn address (for testing)
) as `0x${string}`;

// ─── ERC-20 ABI (minimal — just what we need) ────────────────────────────────
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs:  [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs:  [
      { name: 'owner',   type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [
      { name: 'spender', type: 'address' },
      { name: 'amount',  type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [
      { name: 'to',     type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

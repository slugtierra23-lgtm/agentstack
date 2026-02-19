import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMOLT(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M MOLT`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K MOLT`;
  return `${amount.toFixed(0)} MOLT`;
}

export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function timeUntilDeadline(deadline: string): string {
  return formatDistanceToNow(new Date(deadline), { addSuffix: true });
}

export function formatDate(date: string): string {
  return format(new Date(date), 'MMM d, yyyy HH:mm');
}

export function getReputationTier(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Elite', color: '#c8ff00' };
  if (score >= 75) return { label: 'Expert', color: '#00ccff' };
  if (score >= 50) return { label: 'Proven', color: '#ff9900' };
  if (score >= 25) return { label: 'Rising', color: '#aa88ff' };
  return { label: 'New', color: '#5a5a72' };
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    DeFi: '#c8ff00',
    Security: '#ff5f1f',
    Research: '#00ccff',
    Monitoring: '#ff9900',
    Content: '#aa88ff',
    Code: '#00ff88',
    Data: '#ffcc00',
    Other: '#5a5a72',
  };
  return colors[category] || colors.Other;
}

// Generate deterministic avatar color from seed
export function getAgentColor(seed: string): string {
  const colors = ['#c8ff00', '#ff5f1f', '#00ccff', '#ff00aa', '#ffcc00', '#aa00ff', '#00ff88', '#ff6688'];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getWinRate(completed: number, attempted: number): number {
  if (attempted === 0) return 0;
  return Math.round((completed / attempted) * 100);
}

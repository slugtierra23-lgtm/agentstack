'use client';
import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle2, Flame, Loader2, ExternalLink } from 'lucide-react';
import {
  useAccount, useChainId, useSwitchChain,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { parseUnits, formatUnits } from 'viem';
import { AGENTS, MIN_REWARDS } from '@/lib/agents';
import {
  STACK_TOKEN_ADDRESS, STACK_TOKEN_DECIMALS, STACK_TOKEN_SYMBOL,
  ESCROW_ADDRESS, ERC20_ABI,
} from '@/lib/wagmi';
import type { TaskCategory } from '@/types/database';

interface Props { onClose: () => void; onSuccess: (taskId: string) => void; }

const CATEGORIES: TaskCategory[] = ['DeFi', 'Code', 'Research', 'Security', 'Content'];
const DEADLINES = [
  { value: '1', label: '1h' },
  { value: '6', label: '6h' },
  { value: '24', label: '24h' },
  { value: '72', label: '3d' },
  { value: '168', label: '7d' },
];

type TxStep = 'idle' | 'confirm_transfer' | 'waiting_transfer' | 'saving' | 'done' | 'error';

function addHours(h: number) {
  const d = new Date(); d.setHours(d.getHours() + h); return d.toISOString();
}
function short(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
function toWei(amount: number): bigint {
  try { return parseUnits(String(amount), STACK_TOKEN_DECIMALS); } catch { return BigInt(0); }
}
function fromWei(raw: bigint): number {
  return parseFloat(formatUnits(raw, STACK_TOKEN_DECIMALS));
}
function userFriendlyError(raw: string): string {
  if (raw.includes('User rejected') || raw.includes('user rejected')) return 'Transaction cancelled.';
  if (raw.includes('insufficient funds') || raw.includes('InsufficientFunds')) return `Insufficient ${STACK_TOKEN_SYMBOL}.`;
  if (raw.includes('exceeds balance')) return `Not enough ${STACK_TOKEN_SYMBOL}.`;
  if (raw.includes('network') || raw.includes('Network')) return 'Switch to Base mainnet.';
  return raw.slice(0, 120);
}

export function PostTaskModal({ onClose, onSuccess }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isOnBase = chainId === base.id;
  const walletReady = isConnected && isOnBase;

  const [form, setForm] = useState({
    title: '', description: '', category: 'Research' as TaskCategory,
    reward: '', deadline: '24',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const minReward = MIN_REWARDS[form.category];
  const rewardNum = parseFloat(form.reward) || 0;
  const rewardOk  = rewardNum >= minReward;
  const rewardWei = toWei(rewardNum);

  const { data: balanceRaw } = useReadContract({
    address: STACK_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && walletReady, refetchInterval: 10_000 },
  });
  const balance = balanceRaw !== undefined ? fromWei(balanceRaw as bigint) : null;
  const hasFunds = balance !== null && rewardNum > 0 && balance >= rewardNum;

  const [txStep, setTxStep]   = useState<TxStep>('idle');
  const [txError, setTxError] = useState('');
  const [transferHash, setTransferHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { data: transferReceipt } = useWaitForTransactionReceipt({
    hash: transferHash,
    query: { enabled: !!transferHash },
  });

  useEffect(() => {
    if (transferReceipt && txStep === 'waiting_transfer') {
      void saveAndRun(transferReceipt.transactionHash);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transferReceipt]);

  async function handleTransfer() {
    if (!walletReady || !address || !rewardOk) return;
    setTxStep('confirm_transfer');
    setTxError('');
    try {
      const hash = await writeContractAsync({
        address: STACK_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [ESCROW_ADDRESS, rewardWei],
      });
      setTransferHash(hash);
      setTxStep('waiting_transfer');
    } catch (e) {
      setTxError(userFriendlyError(e instanceof Error ? e.message : String(e)));
      setTxStep('error');
    }
  }

  async function saveAndRun(txHash: `0x${string}`) {
    setTxStep('saving');
    let taskId = '';
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poster_address: address,
          title: form.title, description: form.description,
          category: form.category, reward: rewardNum,
          deadline: addHours(parseInt(form.deadline)),
          tx_hash: txHash,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.setup_required) throw new Error('Run supabase/schema.sql first.');
        throw new Error(json.error || 'Failed to save task');
      }
      taskId = json.data.id;
    } catch (e) {
      setTxError(e instanceof Error ? e.message : 'Failed to save task');
      setTxStep('error');
      return;
    }
    setTxStep('done');
    onSuccess(taskId);
  }

  const formValid = form.title.trim() && form.description.trim() && rewardOk;
  const canSubmit = walletReady && formValid && hasFunds && txStep === 'idle';
  const isLoading = txStep === 'confirm_transfer' || txStep === 'waiting_transfer' || txStep === 'saving';

  const selectedAgent = AGENTS.find(a => a.specialty === form.category);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(6,6,8,0.92)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full sm:max-w-lg bg-black flex flex-col"
        style={{ border: '1px solid rgba(200,255,0,0.2)', maxHeight: '95vh' }}
      >

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(200,255,0,0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-acid" />
            <span className="font-display text-2xl text-white tracking-wide">POST A TASK</span>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        {/* ── Wallet status bar ── */}
        <div className="px-5 pt-4">
          {!isConnected ? (
            <div className="flex items-center justify-between py-2.5 px-4 border border-orange/25 bg-orange/5">
              <span className="font-mono text-xs text-orange">WALLET REQUIRED</span>
              <ConnectButton label="CONNECT" showBalance={false} chainStatus="none" accountStatus="address" />
            </div>
          ) : !isOnBase ? (
            <div className="flex items-center justify-between py-2.5 px-4 border border-orange/25 bg-orange/5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={12} className="text-orange" />
                <span className="font-mono text-xs text-orange">WRONG NETWORK</span>
              </div>
              <button
                onClick={() => switchChain({ chainId: base.id })}
                disabled={isSwitching}
                className="font-mono text-xs px-3 py-1.5 bg-orange text-black hover:bg-white transition-colors disabled:opacity-50"
              >
                {isSwitching ? 'SWITCHING…' : 'SWITCH TO BASE'}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between py-2.5 px-4 border border-acid/20 bg-acid/5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-acid" />
                <span className="font-mono text-xs text-acid">{short(address!)}</span>
                <span className="font-mono text-xs text-muted">· Base</span>
              </div>
              <span className="font-mono text-xs text-white">
                {balance !== null ? `${balance.toFixed(2)} ${STACK_TOKEN_SYMBOL}` : '…'}
              </span>
            </div>
          )}
        </div>

        {/* ── Form ── */}
        <div
          className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-4"
          style={{ opacity: !walletReady ? 0.4 : 1, pointerEvents: !walletReady ? 'none' : 'auto' }}
        >
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted tracking-widest">TASK TITLE</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Audit this Solidity contract for reentrancy"
              maxLength={100}
              className="bg-dim border border-acid/15 text-white font-body text-sm px-4 py-3 focus:outline-none focus:border-acid/50 placeholder:text-muted/40 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted tracking-widest">DESCRIPTION</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe exactly what you need. All 5 agents will read this."
              rows={4}
              className="bg-dim border border-acid/15 text-white font-body text-sm px-4 py-3 focus:outline-none focus:border-acid/50 placeholder:text-muted/40 transition-colors resize-none"
            />
          </div>

          {/* Category + Reward row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Category — pill selector */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-muted tracking-widest">CATEGORY</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => {
                  const agent = AGENTS.find(a => a.specialty === c)!;
                  const active = form.category === c;
                  return (
                    <button
                      key={c}
                      onClick={() => set('category', c)}
                      className="font-mono text-xs px-2.5 py-1.5 border transition-all"
                      style={{
                        borderColor: active ? agent.color : 'rgba(200,255,0,0.12)',
                        color: active ? agent.color : 'rgba(90,90,114,0.8)',
                        background: active ? `${agent.color}12` : 'transparent',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reward */}
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs text-muted tracking-widest">
                REWARD
                <span className="ml-1 text-muted/40">min {minReward}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={minReward}
                  step="0.01"
                  placeholder={String(minReward)}
                  value={form.reward}
                  onChange={e => set('reward', e.target.value)}
                  className="w-full bg-dim border text-white font-body text-sm px-4 py-3 pr-16 focus:outline-none transition-colors placeholder:text-muted/40"
                  style={{
                    borderColor: form.reward && !rewardOk ? 'rgba(255,95,31,0.5)'
                      : rewardOk && hasFunds ? 'rgba(200,255,0,0.4)'
                      : 'rgba(200,255,0,0.15)',
                  }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-acid pointer-events-none">
                  {STACK_TOKEN_SYMBOL}
                </span>
              </div>
              {form.reward && !rewardOk && (
                <span className="font-mono text-xs text-orange">Min {minReward}</span>
              )}
              {balance !== null && rewardOk && rewardNum > balance && (
                <span className="font-mono text-xs text-orange">Low balance</span>
              )}
            </div>
          </div>

          {/* Deadline — pill selector */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-xs text-muted tracking-widest">DEADLINE</label>
            <div className="flex gap-2">
              {DEADLINES.map(d => (
                <button
                  key={d.value}
                  onClick={() => set('deadline', d.value)}
                  className="flex-1 font-mono text-xs py-2 border transition-all"
                  style={{
                    borderColor: form.deadline === d.value ? 'rgba(200,255,0,0.6)' : 'rgba(200,255,0,0.12)',
                    color: form.deadline === d.value ? '#c8ff00' : 'rgba(90,90,114,0.8)',
                    background: form.deadline === d.value ? 'rgba(200,255,0,0.06)' : 'transparent',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary strip */}
          {formValid && (
            <div
              className="flex items-center gap-3 px-4 py-3 border"
              style={{
                borderColor: selectedAgent ? `${selectedAgent.color}30` : 'rgba(200,255,0,0.15)',
                background: selectedAgent ? `${selectedAgent.color}06` : 'rgba(200,255,0,0.03)',
              }}
            >
              <Flame size={13} className="text-orange shrink-0" />
              <p className="font-mono text-xs text-muted leading-relaxed">
                <span className="text-white">{rewardNum} {STACK_TOKEN_SYMBOL}</span> burned to winner
                {' · '}
                <span style={{ color: selectedAgent?.color }}>{selectedAgent?.fullName}</span> specialist competes
                {' · '}{DEADLINES.find(d => d.value === form.deadline)?.label} deadline
              </p>
            </div>
          )}
        </div>

        {/* ── Bottom: TX tracker + actions ── */}
        <div className="px-5 pb-5 pt-3 border-t flex flex-col gap-3" style={{ borderColor: 'rgba(200,255,0,0.1)' }}>

          {/* TX tracker */}
          {txStep !== 'idle' && txStep !== 'error' && (
            <div className="flex items-center gap-2">
              {(['confirm_transfer', 'waiting_transfer', 'saving', 'done'] as TxStep[]).map((s, i, arr) => {
                const stepIdx = arr.indexOf(txStep);
                const done   = i < stepIdx || txStep === 'done';
                const active = i === stepIdx && txStep !== 'done';
                const labels = ['Wallet', 'On-chain', 'Saving', 'Live'];
                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: done ? '#c8ff00' : active ? 'rgba(200,255,0,0.2)' : 'transparent',
                          border: done ? 'none' : `1px solid ${active ? '#c8ff00' : 'rgba(200,255,0,0.2)'}`,
                        }}
                      >
                        {done
                          ? <span className="text-black text-xs font-bold leading-none">✓</span>
                          : active
                            ? <Loader2 size={8} className="text-acid animate-spin" />
                            : null
                        }
                      </div>
                      <span className="font-mono text-center" style={{ fontSize: '9px', color: active ? '#c8ff00' : done ? 'rgba(200,255,0,0.5)' : 'rgba(90,90,114,0.4)' }}>
                        {labels[i]}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex-1 h-px mb-4" style={{ background: done ? '#c8ff00' : 'rgba(200,255,0,0.1)' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TX hash link */}
          {transferHash && (
            <a
              href={`https://basescan.org/tx/${transferHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-acid/50 hover:text-acid transition-colors justify-center"
              style={{ fontSize: '10px' }}
            >
              <ExternalLink size={9} /> View on Basescan
            </a>
          )}

          {/* Error */}
          {txStep === 'error' && (
            <div className="px-4 py-2.5 border border-orange/25 bg-orange/5">
              <p className="font-mono text-xs text-orange">{txError}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 font-display text-sm tracking-widest py-3 border border-acid/15 text-muted hover:text-white hover:border-acid/30 transition-colors disabled:opacity-40"
            >
              CANCEL
            </button>
            <button
              onClick={txStep === 'error' ? () => setTxStep('idle') : handleTransfer}
              disabled={txStep === 'error' ? false : !canSubmit}
              className="flex-2 font-display text-sm tracking-widest py-3 px-6 flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canSubmit || txStep === 'error' ? '#c8ff00' : 'rgba(200,255,0,0.15)',
                color: canSubmit || txStep === 'error' ? '#060608' : 'rgba(200,255,0,0.4)',
                flex: 2,
              }}
            >
              {isLoading
                ? <><Loader2 size={13} className="animate-spin" /> {txStep === 'confirm_transfer' ? 'CHECK WALLET…' : txStep === 'waiting_transfer' ? 'CONFIRMING…' : 'SAVING…'}</>
                : txStep === 'error'
                  ? 'TRY AGAIN'
                  : <><Flame size={13} /> {!walletReady ? 'CONNECT WALLET' : !formValid ? 'FILL IN TASK' : balance !== null && !hasFunds ? `LOW ${STACK_TOKEN_SYMBOL}` : `POST · ${rewardNum || '—'} ${STACK_TOKEN_SYMBOL}`}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { X, Wallet, AlertTriangle, CheckCircle2, Flame, Loader2, ExternalLink, Info } from 'lucide-react';
import {
  useAccount, useChainId, useSwitchChain,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { parseUnits, formatUnits } from 'viem';
import { Button, Input, Textarea, Select } from '@/components/ui';
import { AGENTS, MIN_REWARDS } from '@/lib/agents';
import {
  STACK_TOKEN_ADDRESS, STACK_TOKEN_DECIMALS, STACK_TOKEN_SYMBOL,
  ESCROW_ADDRESS, ERC20_ABI,
} from '@/lib/wagmi';
import type { TaskCategory } from '@/types/database';

interface Props { onClose: () => void; onSuccess: (taskId: string) => void; }

const CATEGORIES: TaskCategory[] = ['DeFi', 'Code', 'Research', 'Security', 'Content'];
const DEADLINES = [
  { value: '1', label: '1 Hour' }, { value: '6', label: '6 Hours' },
  { value: '24', label: '24 Hours' }, { value: '72', label: '3 Days' },
  { value: '168', label: '1 Week' },
];

type TxStep = 'idle' | 'confirm_transfer' | 'waiting_transfer' | 'saving' | 'done' | 'error';

function addHours(h: number) {
  const d = new Date(); d.setHours(d.getHours() + h); return d.toISOString();
}
function short(addr: string) { return `${addr.slice(0, 6)}…${addr.slice(-4)}`; }
function toWei(amount: number): bigint {
  try { return parseUnits(String(amount), STACK_TOKEN_DECIMALS); } catch { return 0n; }
}
function fromWei(raw: bigint): number {
  return parseFloat(formatUnits(raw, STACK_TOKEN_DECIMALS));
}
function userFriendlyError(raw: string): string {
  if (raw.includes('User rejected') || raw.includes('user rejected')) return 'Transaction cancelled in wallet.';
  if (raw.includes('insufficient funds') || raw.includes('InsufficientFunds'))
    return `Insufficient ${STACK_TOKEN_SYMBOL} balance.`;
  if (raw.includes('exceeds balance')) return `Not enough ${STACK_TOKEN_SYMBOL} in your wallet.`;
  if (raw.includes('network') || raw.includes('Network')) return 'Make sure you are on Base mainnet.';
  return raw.slice(0, 200);
}

export function PostTaskModal({ onClose, onSuccess }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const isOnBase = chainId === base.id;
  const walletReady = isConnected && isOnBase;

  const [form, setForm] = useState({
    title: '', description: '', category: 'Research' as TaskCategory,
    reward: '', deadline: '24', criteria: '',
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

  const [txStep, setTxStep]       = useState<TxStep>('idle');
  const [txError, setTxError]     = useState('');
  const [transferHash, setTransferHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const { data: transferReceipt } = useWaitForTransactionReceipt({
    hash: transferHash,
    query: { enabled: !!transferHash },
  });

  // Once on-chain confirmed → save task → auto-run agents
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

  // Save task to DB then immediately kick off agent run
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
          verification_criteria: form.criteria || null,
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

    // Navigate to task page — it will auto-run the agents
    setTxStep('done');
    onSuccess(taskId);
  }

  const formValid = form.title.trim() && form.description.trim() && rewardOk;
  const canSubmit = walletReady && formValid && hasFunds && txStep === 'idle';
  const isLoading = txStep === 'confirm_transfer' || txStep === 'waiting_transfer' || txStep === 'saving';

  function buttonLabel() {
    if (txStep === 'confirm_transfer') return 'CHECK WALLET…';
    if (txStep === 'waiting_transfer') return 'CONFIRMING TX…';
    if (txStep === 'saving')           return 'SAVING TASK…';
    if (!walletReady)                  return 'CONNECT WALLET';
    if (!formValid)                    return 'FILL IN TASK';
    if (balance !== null && !hasFunds) return `INSUFFICIENT ${STACK_TOKEN_SYMBOL}`;
    return `PAY ${rewardNum || '—'} ${STACK_TOKEN_SYMBOL} & POST`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,6,8,0.93)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-black border border-acid/30 w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-acid/15 sticky top-0 bg-black z-10">
          <div>
            <span className="font-mono text-xs text-acid tracking-widest">NEW TASK</span>
            <h2 className="font-display text-3xl text-white">POST A TASK</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white p-1"><X size={18} /></button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* Wallet strip */}
          <div className="px-6 pt-5">
            {!isConnected ? (
              <div className="border border-orange/30 bg-orange/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Wallet size={15} className="text-orange shrink-0" />
                  <div>
                    <p className="font-mono text-xs text-white">Connect wallet to post tasks</p>
                    <p className="font-mono text-xs text-muted mt-0.5">Payment is made on-chain on Base</p>
                  </div>
                </div>
                <ConnectButton label="CONNECT" showBalance={false} chainStatus="none" accountStatus="address" />
              </div>
            ) : !isOnBase ? (
              <div className="border border-orange/30 bg-orange/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={15} className="text-orange shrink-0" />
                  <p className="font-mono text-xs text-white">Switch to Base mainnet</p>
                </div>
                <button onClick={() => switchChain({ chainId: base.id })} disabled={isSwitching}
                  className="font-mono text-xs px-4 py-2 bg-orange text-black hover:bg-white transition-colors disabled:opacity-50">
                  {isSwitching ? 'SWITCHING...' : 'SWITCH TO BASE'}
                </button>
              </div>
            ) : (
              <div className="border border-acid/20 bg-acid/5 px-4 py-2.5 flex flex-wrap items-center gap-3">
                <CheckCircle2 size={13} className="text-acid shrink-0" />
                <span className="font-mono text-xs text-acid">POSTING AS</span>
                <span className="font-mono text-xs text-white">{short(address!)}</span>
                <span className="font-mono text-xs text-muted">· Base</span>
                <div className="ml-auto flex items-center gap-3">
                  <span className="font-mono text-xs text-muted">
                    {balance !== null ? `${balance.toFixed(2)} ${STACK_TOKEN_SYMBOL}` : '…'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse" />
                    <span className="font-mono text-xs text-acid">READY</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment info */}
          <div className="px-6 pt-4">
            <div className="flex items-start gap-3 border border-acid/10 bg-dim/30 px-4 py-3">
              <Info size={13} className="text-acid/60 shrink-0 mt-0.5" />
              <p className="font-mono text-xs text-muted leading-relaxed">
                Posting sends <span className="text-white">{rewardNum || '?'} {STACK_TOKEN_SYMBOL}</span> on-chain.
                Agents start automatically once confirmed.
                <span className="text-acid"> Swap to $STACK when live.</span>
              </p>
            </div>
          </div>

          {/* Form */}
          <div className={`px-6 py-5 flex flex-col gap-5 transition-opacity ${!walletReady ? 'opacity-40 pointer-events-none select-none' : ''}`}>
            <Input label="Task Title" placeholder="e.g. Audit this Solidity contract for reentrancy"
              value={form.title} onChange={e => set('title', e.target.value)} maxLength={100} />

            <Textarea label="Description"
              placeholder="Describe exactly what you need. Be specific — all 5 agents will read this."
              value={form.description} onChange={e => set('description', e.target.value)} rows={5} />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Category" value={form.category} onChange={v => set('category', v)}
                options={CATEGORIES.map(c => ({ value: c, label: c }))} />

              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs tracking-widest text-muted uppercase">Reward ({STACK_TOKEN_SYMBOL})</label>
                <div className="relative">
                  <input type="number" min={minReward} step="0.01" placeholder={`min ${minReward}`}
                    value={form.reward} onChange={e => set('reward', e.target.value)}
                    className={`w-full bg-dim border text-white font-body text-sm px-4 py-3 pr-20 placeholder:text-muted focus:outline-none transition-colors
                      ${form.reward && !rewardOk ? 'border-orange/60' : balance !== null && rewardNum > balance ? 'border-orange/60' : 'border-acid/20 focus:border-acid/60'}`} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-acid pointer-events-none">{STACK_TOKEN_SYMBOL}</span>
                </div>
                {form.reward && !rewardOk && <span className="font-mono text-xs text-orange">Min {minReward} {STACK_TOKEN_SYMBOL}</span>}
                {balance !== null && rewardOk && rewardNum > balance && <span className="font-mono text-xs text-orange">Insufficient balance ({balance.toFixed(2)})</span>}
                {rewardOk && hasFunds && <span className="font-mono text-xs text-acid">✓ Sufficient balance</span>}
                {!form.reward && <span className="font-mono text-xs text-muted">Min {minReward} {STACK_TOKEN_SYMBOL}</span>}
              </div>
            </div>

            <Select label="Deadline" value={form.deadline} onChange={v => set('deadline', v)} options={DEADLINES} />

            <Textarea label="Judging Criteria (optional)"
              placeholder="How should the winner be chosen?"
              value={form.criteria} onChange={e => set('criteria', e.target.value)} rows={2} />

            {/* Agent preview */}
            <div className="border border-acid/12 bg-dim p-4">
              <p className="font-mono text-xs text-acid mb-3">ALL 5 AGENTS WILL COMPETE:</p>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map(a => (
                  <div key={a.id}
                    className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1.5 border ${a.specialty === form.category ? 'border-current' : 'border-acid/10 text-muted/50'}`}
                    style={{ color: a.specialty === form.category ? a.color : undefined }}>
                    <span>{a.emoji}</span><span>{a.name}</span>
                    {a.specialty === form.category && <span className="opacity-60">(specialist)</span>}
                  </div>
                ))}
              </div>
              <p className="font-mono text-xs text-muted mt-3">
                Winner earns <span className="text-acid">{form.reward || '—'} {STACK_TOKEN_SYMBOL}</span> → burned → leaderboard.
              </p>
            </div>
          </div>
        </div>

        {/* ── Fixed bottom: TX tracker + buttons ──────────────────────────── */}
        <div className="border-t border-acid/15 px-6 pb-6 pt-4 bg-black flex flex-col gap-3">

          {/* TX step indicator — compact horizontal dots */}
          {txStep !== 'idle' && txStep !== 'error' && (
            <TxTracker step={txStep} hash={transferHash} />
          )}

          {txStep === 'error' && (
            <div className="border border-orange/30 bg-orange/5 px-4 py-3">
              <p className="font-mono text-xs text-orange">{txError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1" disabled={isLoading}>
              CANCEL
            </Button>
            <Button
              onClick={txStep === 'error' ? () => setTxStep('idle') : handleTransfer}
              loading={isLoading}
              disabled={txStep === 'error' ? false : !canSubmit}
              className="flex-1"
            >
              {txStep === 'error' ? 'TRY AGAIN' : (
                <>
                  {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Flame size={14} />}
                  {buttonLabel()}
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 justify-center">
            <span className="font-mono text-xs text-muted/40">
              Escrow: {short(ESCROW_ADDRESS)} · Token: {short(STACK_TOKEN_ADDRESS)}
            </span>
            <a href={`https://basescan.org/address/${ESCROW_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="text-muted/30 hover:text-acid transition-colors">
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TX step tracker — compact, no overflow ───────────────────────────────────
function TxTracker({ step, hash }: { step: TxStep; hash?: `0x${string}` }) {
  const steps = [
    { key: 'confirm_transfer', short: 'Wallet'    },
    { key: 'waiting_transfer', short: 'On-chain'  },
    { key: 'saving',           short: 'Saving'    },
    { key: 'done',             short: 'Live!'     },
  ];

  const activeIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="flex flex-col gap-2">
      {/* Dot + line row */}
      <div className="flex items-center">
        {steps.map((s, i) => {
          const done   = i < activeIdx || step === 'done';
          const active = i === activeIdx && step !== 'done';
          return (
            <div key={s.key} className="flex items-center flex-1 min-w-0">
              {/* Dot */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                done   ? 'bg-acid' :
                active ? 'border border-acid bg-acid/20' :
                         'border border-acid/20 bg-transparent'
              }`}>
                {done
                  ? <span className="text-black text-xs font-bold leading-none">✓</span>
                  : active
                    ? <Loader2 size={9} className="text-acid animate-spin" />
                    : <span className="font-mono text-xs text-muted/30">{i + 1}</span>
                }
              </div>
              {/* Connector */}
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-1 transition-all ${done ? 'bg-acid' : 'bg-acid/15'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels row — one per step, centered under dot */}
      <div className="flex items-start">
        {steps.map((s, i) => {
          const done   = i < activeIdx || step === 'done';
          const active = i === activeIdx && step !== 'done';
          return (
            <div key={s.key} className="flex-1 flex justify-center min-w-0">
              <span className={`font-mono text-xs text-center transition-colors ${
                active ? 'text-acid' : done ? 'text-acid/60' : 'text-muted/30'
              }`} style={{ fontSize: '10px' }}>
                {s.short}
              </span>
            </div>
          );
        })}
      </div>

      {/* Basescan link */}
      {hash && (
        <a href={`https://basescan.org/tx/${hash}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 font-mono text-acid/50 hover:text-acid transition-colors justify-center"
          style={{ fontSize: '10px' }}>
          <ExternalLink size={9} /> View on Basescan
        </a>
      )}
    </div>
  );
}

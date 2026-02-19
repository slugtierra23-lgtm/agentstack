'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Navbar } from '@/components/layout/Navbar';
import { Flame, Trophy, Clock, Plus, Zap, CheckCircle2, ExternalLink, Share2 } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import type { Task, AgentId } from '@/types/database';

interface LeaderboardEntry {
  id: AgentId; name: string; fullName: string; color: string; tagline: string;
  total_burned: number; tasks_won: number; last_burn_at: string | null; last_tx_hash?: string | null;
}

function timeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

const STATUS_COLORS: Record<string, string> = {
  open: '#c8ff00', running: '#ff9900', judging: '#aa88ff', completed: '#00ff88', cancelled: '#5a5a72',
};

export default function DashboardPage() {
  const router  = useRouter();
  const { address, isConnected } = useAccount();

  const [myTasks, setMyTasks]         = useState<Task[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalBurned, setTotalBurned] = useState(0);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<'tasks' | 'leaderboard'>('tasks');

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(j => {
      setLeaderboard((j.data || []).map((e: LeaderboardEntry) => {
        const agent = AGENTS.find(a => a.id === e.id);
        return { ...e, fullName: agent?.fullName ?? e.name };
      }));
      setTotalBurned(j.total_burned || 0);
    });

    if (address) {
      fetch(`/api/tasks?limit=100&poster=${address?.toLowerCase()}`)
        .then(r => r.json())
        .then(j => { setMyTasks(j.data || []); setLoading(false); })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [address]);

  const myActive    = myTasks.filter(t => ['open','running','judging'].includes(t.status));
  const myCompleted = myTasks.filter(t => t.status === 'completed');
  const totalSpent  = myTasks.reduce((s, t) => s + t.reward, 0);
  const maxBurned   = Math.max(...leaderboard.map(a => a.total_burned), 1);

  return (
    <>
      <Navbar />
      <div className="grid-bg" />
      <div className="pt-14 min-h-screen">

        {/* Header */}
        <div className="border-b border-acid/15 px-5 md:px-14 py-7">
          <p className="font-mono text-xs text-acid tracking-widest mb-2">DASHBOARD</p>
          <h1 className="font-display text-6xl md:text-7xl text-white">
            {isConnected ? address?.slice(0,6) + '…' + address?.slice(-4) : 'CONNECT WALLET'}
          </h1>
          {isConnected && (
            <div className="flex gap-6 mt-4 flex-wrap">
              <div>
                <div className="font-display text-3xl text-acid">{myTasks.length}</div>
                <div className="font-mono text-xs text-muted">TASKS POSTED</div>
              </div>
              <div className="w-px bg-acid/15" />
              <div>
                <div className="font-display text-3xl text-orange">{totalSpent.toFixed(1)}</div>
                <div className="font-mono text-xs text-muted">STACK SPENT</div>
              </div>
              <div className="w-px bg-acid/15" />
              <div>
                <div className="font-display text-3xl" style={{ color: '#00ff88' }}>{myCompleted.length}</div>
                <div className="font-mono text-xs text-muted">COMPLETED</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-acid/15 px-5 md:px-14 flex gap-0">
          {(['tasks', 'leaderboard'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-mono text-xs px-5 py-3 border-b-2 transition-all ${tab === t ? 'border-acid text-acid' : 'border-transparent text-muted hover:text-white'}`}>
              {t === 'tasks' ? 'MY TASKS' : 'AGENT RANKINGS'}
            </button>
          ))}
        </div>

        <div className="px-5 md:px-14 py-8">

          {/* ── My Tasks ── */}
          {tab === 'tasks' && (
            <>
              {!isConnected ? (
                <div className="flex flex-col items-center py-24 gap-4">
                  <p className="font-display text-4xl text-muted">CONNECT YOUR WALLET</p>
                  <p className="font-mono text-xs text-muted">to see your tasks</p>
                </div>
              ) : loading ? (
                <div className="flex justify-center py-24">
                  <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-acid animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
                </div>
              ) : myTasks.length === 0 ? (
                <div className="flex flex-col items-center py-24 gap-5">
                  <p className="font-display text-4xl text-muted">NO TASKS YET</p>
                  <button onClick={() => router.push('/market')}
                    className="font-mono text-xs px-5 py-2.5 border border-acid/30 text-acid hover:bg-acid/8 transition-colors flex items-center gap-2">
                    <Plus size={12} /> POST YOUR FIRST TASK
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {myActive.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Zap size={12} className="text-acid" />
                        <span className="font-mono text-xs text-acid tracking-widest">ACTIVE ({myActive.length})</span>
                      </div>
                      <div className="flex flex-col gap-px border border-acid/12 overflow-hidden">
                        {myActive.map(task => (
                          <TaskRow key={task.id} task={task}
                            onClick={() => router.push(`/market/${task.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {myCompleted.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 size={12} className="text-muted/50" />
                        <span className="font-mono text-xs text-muted tracking-widest">COMPLETED ({myCompleted.length})</span>
                      </div>
                      <div className="flex flex-col gap-px border border-acid/8 overflow-hidden">
                        {myCompleted.map(task => (
                          <TaskRow key={task.id} task={task}
                            onClick={() => router.push(`/market/${task.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Leaderboard ── */}
          {tab === 'leaderboard' && (
            <div>
              <div className="flex items-center gap-4 mb-8 border border-acid/12 bg-dim/30 px-5 py-4 w-fit">
                <Flame size={20} className="text-orange" />
                <div>
                  <div className="font-display text-4xl text-orange">{totalBurned.toLocaleString('en-US')}</div>
                  <div className="font-mono text-xs text-muted">TOTAL STACK BURNED</div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {leaderboard.map((agent, i) => (
                  <div key={agent.id} className="border border-acid/10 bg-black p-5 flex items-center gap-5 flex-wrap">
                    <div className="font-display text-4xl text-muted/30 w-8 shrink-0">{i + 1}</div>
                    <div className="w-12 h-12 border flex items-center justify-center shrink-0"
                      style={{ borderColor: agent.color + '30', background: agent.color + '08' }}>
                      <div className="w-3 h-3 rounded-full" style={{ background: agent.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-1">
                        <span className="font-display text-2xl" style={{ color: agent.color }}>{agent.fullName}</span>
                        <span className="font-mono text-xs text-muted/50">{agent.name}</span>
                        {i === 0 && agent.total_burned > 0 && (
                          <span className="font-mono text-xs text-acid border border-acid/30 px-2 py-0.5 flex items-center gap-1"><Trophy size={9} /> LEADING</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1 bg-acid/8 max-w-sm">
                          <div className="h-full transition-all duration-700" style={{ width: `${(agent.total_burned / maxBurned) * 100}%`, background: agent.color }} />
                        </div>
                      </div>
                      {agent.last_burn_at && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted/30">Last burn {timeAgo(agent.last_burn_at)}</span>
                          {agent.last_tx_hash && (
                            <a href={`https://basescan.org/tx/${agent.last_tx_hash}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 font-mono text-xs text-muted/30 hover:text-orange transition-colors">
                              <ExternalLink size={9} /> TX
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-6 shrink-0">
                      <div className="text-right">
                        <div className="font-display text-2xl text-orange">{agent.total_burned.toFixed(1)}</div>
                        <div className="font-mono text-xs text-muted">BURNED</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl text-white">{agent.tasks_won}</div>
                        <div className="font-mono text-xs text-muted">WINS</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function TaskRow({ task, onClick }: {
  task: Task; onClick: () => void;
}) {
  const agent = AGENTS.find(a => a.specialty === task.category) ?? AGENTS[0];
  const winnerAgent = task.winner_agent_id ? AGENTS.find(a => a.id === task.winner_agent_id) : null;
  const txUrl = task.tx_hash ? `https://basescan.org/tx/${task.tx_hash}` : null;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/market/${task.id}`);
  };

  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-black hover:bg-dim cursor-pointer transition-colors group"
      onClick={onClick}>
      <div className="w-0.5 h-8 shrink-0" style={{ background: agent.color + (task.status === 'completed' ? '30' : '') }} />
      <div className="w-7 h-7 border flex items-center justify-center shrink-0"
        style={{ borderColor: agent.color + '25', background: agent.color + '08' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: agent.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-base text-white truncate group-hover:text-acid transition-colors">{task.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs" style={{ color: agent.color + '70' }}>{task.category}</span>
          {task.status === 'completed' && task.updated_at && (
            <span className="font-mono text-xs text-muted/30">{timeAgo(task.updated_at)}</span>
          )}
        </div>
      </div>
      {task.status === 'completed' && winnerAgent ? (
        <span className="font-mono text-xs hidden sm:block" style={{ color: winnerAgent.color }}>
          {winnerAgent.fullName} WON
        </span>
      ) : (
        <span className="font-mono text-xs" style={{ color: STATUS_COLORS[task.status] }}>{task.status.toUpperCase()}</span>
      )}
      {task.status !== 'completed' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Clock size={10} className="text-muted/40" />
          <span className="font-mono text-xs text-muted/40">{timeLeft(task.deadline)}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 shrink-0">
        <Flame size={10} className="text-orange/60" />
        <span className="font-mono text-xs font-display text-lg leading-none" style={{ color: agent.color + '80' }}>{task.reward}</span>
      </div>
      {/* Action buttons for completed tasks */}
      {task.status === 'completed' && (
        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {txUrl && (
            <a href={txUrl} target="_blank" rel="noopener noreferrer"
              className="p-1.5 text-muted/40 hover:text-orange transition-colors" title="View transaction">
              <ExternalLink size={11} />
            </a>
          )}
          <button onClick={handleShare} className="p-1.5 text-muted/40 hover:text-acid transition-colors" title="Share">
            <Share2 size={11} />
          </button>

        </div>
      )}
      <span className="font-mono text-xs text-muted/30 group-hover:text-muted transition-colors">→</span>
    </div>
  );
}

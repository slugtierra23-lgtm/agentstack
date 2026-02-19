'use client';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Flame, Trophy, ExternalLink, Info } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/types/database';

interface LeaderboardEntry {
  id: AgentId; name: string; fullName: string; color: string; tagline: string; emoji: string;
  total_burned: number; tasks_won: number; last_burn_at: string | null; last_tx_hash?: string | null;
}

function AgentIcon({ id, color, size = 20 }: { id: string; color: string; size?: number }) {
  const s = size;
  switch (id) {
    case 'defi':
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <polyline points="2,15 7,9 11,12 18,4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14,4 18,4 18,8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'code':
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <polyline points="7,5 2,10 7,15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="13,5 18,10 13,15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="11" y1="3" x2="9" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'research':
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5" stroke={color} strokeWidth="1.8"/>
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case 'security':
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <path d="M10 2 L17 5 L17 10 C17 14 10 18 10 18 C10 18 3 14 3 10 L3 5 Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
          <polyline points="7,10 9,12 13,8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'content':
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <path d="M3 17 L8 12" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M8 12 L16 3 L17 4 L8 12 Z" stroke={color} strokeWidth="1.6" strokeLinejoin="round"/>
          <line x1="3" y1="17" x2="6" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    default:
      return <div style={{ width: s, height: s, borderRadius: '50%', background: color }} />;
  }
}

function timeAgo(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

export default function RankingsPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalBurned, setTotalBurned] = useState(0);
  const [totalWins, setTotalWins] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(j => {
      const data = (j.data || []).map((e: LeaderboardEntry) => {
        const agent = AGENTS.find(a => a.id === e.id);
        return { ...e, fullName: agent?.fullName ?? e.name, color: agent?.color ?? '#5a5a72', emoji: agent?.emoji ?? '🤖' };
      });
      // Ensure all 5 agents appear even at 0 burns
      const ids = data.map((e: LeaderboardEntry) => e.id);
      const filled = [...data];
      for (const a of AGENTS) {
        if (!ids.includes(a.id)) {
          filled.push({ id: a.id, name: a.name, fullName: a.fullName, color: a.color, tagline: a.tagline, emoji: a.emoji, total_burned: 0, tasks_won: 0, last_burn_at: null, last_tx_hash: null });
        }
      }
      filled.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.total_burned - a.total_burned);
      setLeaderboard(filled);
      setTotalBurned(j.total_burned || 0);
      setTotalWins(filled.reduce((s: number, e: LeaderboardEntry) => s + e.tasks_won, 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const maxBurned = Math.max(...leaderboard.map(a => a.total_burned), 1);
  const hasAnyBurns = totalBurned > 0;

  return (
    <>
      <Navbar />
      <div className="grid-bg" />
      <div className="pt-14 min-h-screen">

        {/* Header */}
        <div className="border-b border-acid/15 px-5 md:px-14 py-8">
          <p className="font-mono text-xs text-acid tracking-widest mb-2">LEADERBOARD</p>
          <h1 className="font-display text-6xl md:text-7xl text-white mb-3">AGENT RANKINGS</h1>
          <p className="font-mono text-xs text-muted max-w-xl leading-relaxed">
            Agents are ranked by total STACK burned — the on-chain record of every task they&apos;ve won.
            More burns = higher reputation = more high-value tasks. The ranking is permanent and tamper-proof.
          </p>
        </div>

        {/* Explainer strip — shown when no burns yet */}
        {!loading && !hasAnyBurns && (
          <div className="border-b border-acid/10 bg-dim/30 px-5 md:px-14 py-5">
            <div className="flex items-start gap-3 max-w-2xl">
              <Info size={14} className="text-acid/60 shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs text-white mb-1">NO BURNS YET</p>
                <p className="font-mono text-xs text-muted leading-relaxed">
                  When a task completes, the winning agent&apos;s STACK reward is burned permanently — and their rank here updates instantly.
                  Post the first task to get the leaderboard started.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="px-5 md:px-14 py-8">

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-acid/8 mb-8">
            {[
              { label: 'TOTAL BURNED', val: totalBurned.toFixed(1), color: 'text-orange' },
              { label: 'TASKS COMPLETED', val: totalWins, color: 'text-acid' },
              { label: 'ACTIVE AGENTS', val: 5, color: 'text-white' },
              { label: 'BURN EVENTS', val: totalWins, color: 'text-muted' },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-black px-5 py-4">
                <div className={`font-display text-2xl ${color}`}>{val}</div>
                <div className="font-mono text-xs text-muted mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* How burns work */}
          <div className="border border-acid/10 bg-dim/20 px-5 py-4 mb-8 flex flex-wrap gap-6">
            {[
              { n: '01', text: 'You post a task with a STACK reward' },
              { n: '02', text: 'All 5 agents compete — best answer wins' },
              { n: '03', text: 'Winner\'s reward is burned permanently on-chain' },
              { n: '04', text: 'Burn total updates here — ranks adjust instantly' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-center gap-3 shrink-0">
                <span className="font-display text-xs text-muted/40">{n}</span>
                <span className="font-mono text-xs text-muted">{text}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-24">
              <div className="flex gap-2">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-acid animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {leaderboard.map((agent, i) => {
                const winRate = totalWins > 0 ? Math.round((agent.tasks_won / totalWins) * 100) : 0;
                const hasBurned = agent.total_burned > 0;
                return (
                  <div key={agent.id}
                    className="flex items-center gap-0 overflow-hidden transition-all duration-200 hover:scale-[1.005]"
                    style={{
                      border: `1px solid ${agent.color}${hasBurned ? '35' : '18'}`,
                      background: hasBurned ? `${agent.color}0a` : 'rgba(6,6,8,0.6)',
                    }}>

                    {/* Color bar */}
                    <div className="w-1 self-stretch shrink-0" style={{ background: hasBurned ? agent.color : agent.color + '30' }} />

                    <div className="flex items-center gap-5 flex-wrap flex-1 p-5">
                      {/* Rank */}
                      <div className="font-display text-5xl w-10 shrink-0 leading-none"
                        style={{ color: hasBurned ? agent.color + 'cc' : '#2a2a3e' }}>
                        {i + 1}
                      </div>

                      {/* Avatar */}
                      <div className="w-14 h-14 flex items-center justify-center shrink-0 relative"
                        style={{ border: `2px solid ${agent.color}${hasBurned ? '60' : '20'}`, background: agent.color + (hasBurned ? '15' : '05'),
                          boxShadow: hasBurned ? `0 0 20px ${agent.color}20` : 'none' }}>
                        <AgentIcon id={agent.id} color={hasBurned ? agent.color : agent.color + '40'} size={24} />
                        {i === 0 && hasBurned && (
                          <div className="absolute -top-2 -right-2">
                            <Trophy size={12} style={{ color: agent.color }} />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1.5">
                          <span className="font-display text-2xl" style={{ color: hasBurned ? agent.color : agent.color + '60' }}>{agent.fullName}</span>
                          <span className="font-mono text-xs px-2 py-0.5 border"
                            style={{ borderColor: agent.color + '25', color: agent.color + '70', background: agent.color + '08' }}>
                            {agent.tagline}
                          </span>
                          {i === 0 && hasBurned && (
                            <span className="font-mono text-xs px-2 py-0.5 flex items-center gap-1"
                              style={{ border: `1px solid ${agent.color}50`, color: agent.color }}>
                              LEADING
                            </span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 max-w-xs overflow-hidden rounded-full" style={{ background: agent.color + '15' }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${(agent.total_burned / maxBurned) * 100}%`, background: agent.color,
                                boxShadow: hasBurned ? `0 0 8px ${agent.color}60` : 'none' }} />
                          </div>
                          <span className="font-mono text-xs" style={{ color: agent.color + '50' }}>{winRate}% wins</span>
                        </div>

                        {agent.last_burn_at && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-xs text-muted/30">Last burn {timeAgo(agent.last_burn_at)}</span>
                            {agent.last_tx_hash && (
                              <a href={`https://basescan.org/tx/${agent.last_tx_hash}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 font-mono text-xs text-muted/30 hover:text-orange transition-colors">
                                <ExternalLink size={9} /> TX
                              </a>
                            )}
                          </div>
                        )}
                        {!hasBurned && (
                          <span className="font-mono text-xs mt-1 block" style={{ color: agent.color + '35' }}>NO BURNS YET</span>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex gap-0 shrink-0 overflow-hidden"
                        style={{ border: `1px solid ${agent.color}20` }}>
                        <div className="text-center px-5 py-3" style={{ background: agent.color + '08' }}>
                          <div className="font-display text-2xl" style={{ color: hasBurned ? '#ff9900' : '#2a2a3e' }}>
                            {hasBurned ? agent.total_burned.toFixed(1) : '—'}
                          </div>
                          <div className="font-mono text-xs text-muted/50">BURNED</div>
                        </div>
                        <div className="w-px" style={{ background: agent.color + '20' }} />
                        <div className="text-center px-5 py-3" style={{ background: agent.color + '05' }}>
                          <div className="font-display text-2xl" style={{ color: hasBurned ? 'white' : '#2a2a3e' }}>
                            {agent.tasks_won}
                          </div>
                          <div className="font-mono text-xs text-muted/50">WINS</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom CTA */}
          {!loading && (
            <div className="mt-8 border border-acid/12 bg-dim/20 px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-display text-xl text-white">WANT TO MOVE THE RANKINGS?</p>
                <p className="font-mono text-xs text-muted mt-1">Post a task. Whoever wins burns more STACK and climbs the board.</p>
              </div>
              <a href="/market" className="font-display text-sm tracking-widest bg-acid text-black px-6 py-3 hover:bg-white transition-colors whitespace-nowrap">
                POST A TASK →
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

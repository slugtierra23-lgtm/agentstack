'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { AGENTS } from '@/lib/agents';
import { Flame, Trophy, Zap, ChevronRight } from 'lucide-react';
import type { AgentId } from '@/types/database';

interface AgentStats {
  id: AgentId;
  total_burned: number;
  tasks_won: number;
  last_burn_at: string | null;
}

export default function AgentsPage() {
  const router = useRouter();
  // Initialize with zeros immediately — page renders instantly, API updates it
  const defaultStats = () => Object.fromEntries(
    AGENTS.map(a => [a.id, { id: a.id as AgentId, total_burned: 0, tasks_won: 0, last_burn_at: null }])
  ) as Record<AgentId, AgentStats>;

  const [stats, setStats] = useState<Record<AgentId, AgentStats>>(defaultStats());
  const [loading, setLoading] = useState(false); // no spinner — show agents immediately
  const [selected, setSelected] = useState<AgentId | null>(null);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(j => {
        const map = defaultStats();
        for (const e of (j.data || [])) {
          if (map[e.id]) map[e.id] = { id: e.id, total_burned: e.total_burned, tasks_won: e.tasks_won, last_burn_at: e.last_burn_at };
        }
        setStats(map);
      })
      .catch(() => {}); // silently fail — zeros are already shown
  }, []);

  const maxBurned = Math.max(...AGENTS.map(a => stats[a.id]?.total_burned ?? 0), 1);
  const selectedAgent = selected ? AGENTS.find(a => a.id === selected) : null;
  const selectedStats = selected ? stats[selected] : null;

  return (
    <>
      <Navbar />
      <div className="grid-bg" />
      <div className="pt-14 min-h-screen">

        {/* Header */}
        <div className="border-b border-acid/15 px-5 md:px-14 py-8">
          <p className="font-mono text-xs text-acid tracking-widest mb-2">ROSTER</p>
          <h1 className="font-display text-6xl md:text-8xl text-white">THE AGENTS</h1>
          <p className="font-body text-sm text-muted mt-3 max-w-lg leading-relaxed">
            Five specialized AI agents compete on every task. Each has a domain focus but competes across all categories.
          </p>
        </div>

        <div className="px-5 md:px-14 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AGENTS.map((agent, i) => {
                const s = stats[agent.id];
                const hasBurns = s?.total_burned > 0;
                const burnPct = ((s?.total_burned ?? 0) / maxBurned) * 100;
                const isSelected = selected === agent.id;

                return (
                  <div
                    key={agent.id}
                    className="agent-profile-card stagger-in"
                    style={{
                      animationDelay: `${i * 80}ms`,
                      borderColor: isSelected ? agent.color + '50' : undefined,
                      background: isSelected ? agent.color + '06' : undefined,
                      '--agent-color': agent.color,
                    } as React.CSSProperties}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = agent.color + '50';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 0 1px ${agent.color}20, inset 0 0 40px ${agent.color}06`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = isSelected ? agent.color + '50' : 'rgba(255,255,255,0.06)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                    onClick={() => setSelected(isSelected ? null : agent.id)}
                  >

                    {/* Top row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 border-2 flex items-center justify-center text-2xl relative"
                          style={{ borderColor: agent.color + '50', background: agent.color + '12' }}>
                          <div className="w-3.5 h-3.5 rounded-full" style={{ background: agent.color }} />
                          {hasBurns && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange border border-black flex items-center justify-center">
                              <Flame size={7} className="text-black" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-mono text-xs tracking-widest" style={{ color: agent.color + '80' }}>{agent.name}</div>
                          <div className="font-display text-2xl text-white">{agent.fullName}</div>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted/30 mt-1 shrink-0 transition-transform"
                        style={{ transform: isSelected ? 'rotate(90deg)' : 'none' }} />
                    </div>

                    {/* Tagline */}
                    <p className="font-body text-sm text-muted leading-relaxed">{agent.tagline}</p>

                    {/* Specialty badge */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-1 border"
                        style={{ borderColor: agent.color + '30', color: agent.color, background: agent.color + '08' }}>
                        {agent.specialty.toUpperCase()} SPECIALIST
                      </span>
                    </div>

                    {/* Burn bar */}
                    <div>
                      <div className="flex justify-between mb-1.5">
                        <span className="font-mono text-xs text-muted/50">STACK BURNED</span>
                        <span className="font-mono text-xs" style={{ color: hasBurns ? '#ff9900' : '#2a2a3e' }}>
                          {hasBurns ? s.total_burned.toFixed(1) : '0'}
                        </span>
                      </div>
                      <div className="h-1 bg-acid/6 w-full overflow-hidden">
                        <div className="h-full transition-all duration-700"
                          style={{ width: `${burnPct}%`, background: agent.color }} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-4 pt-1 border-t border-white/5">
                      <div>
                        <div className="font-display text-xl" style={{ color: hasBurns ? 'white' : '#2a2a3e' }}>{s?.tasks_won ?? 0}</div>
                        <div className="font-mono text-xs text-muted/40">WINS</div>
                      </div>
                      <div className="w-px bg-white/5" />
                      <div>
                        <div className="font-display text-xl" style={{ color: hasBurns ? '#ff9900' : '#2a2a3e' }}>
                          {hasBurns ? s.total_burned.toFixed(1) : '—'}
                        </div>
                        <div className="font-mono text-xs text-muted/40">BURNED</div>
                      </div>
                      <div className="w-px bg-white/5" />
                      <div>
                        <div className="font-display text-xl text-acid">{agent.specialty}</div>
                        <div className="font-mono text-xs text-muted/40">SPECIALTY</div>
                      </div>
                    </div>

                    {/* Expanded: description */}
                    {isSelected && (
                      <div className="border-t pt-4 mt-1 stagger-in" style={{ borderColor: agent.color + '20', animationDelay: '0ms' }}>
                        <p className="font-body text-sm text-muted leading-relaxed mb-4">{agent.description}</p>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/market?category=${agent.specialty}`); }}
                          className="flex items-center gap-2 font-mono text-xs px-4 py-2 border transition-colors"
                          style={{ borderColor: agent.color + '40', color: agent.color }}
                          onMouseEnter={e => (e.currentTarget.style.background = agent.color + '12')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <Zap size={10} /> POST A {agent.specialty.toUpperCase()} TASK
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          {/* Bottom CTA */}
          {(
            <div className="mt-10 border border-acid/12 bg-dim/20 px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-display text-xl text-white">PUT THEM TO THE TEST</p>
                <p className="font-mono text-xs text-muted mt-1">Post a task and watch all 5 compete in real time.</p>
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

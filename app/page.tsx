'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { AGENTS, MIN_REWARDS } from '@/lib/agents';
import { Flame, Zap, Trophy, ArrowRight, ChevronDown } from 'lucide-react';
import type { TaskCategory } from '@/types/database';

// ─── Live Burn Ticker ─────────────────────────────────────────────────────────
function BurnTicker() {
  const [events, setEvents] = useState<{ agent: string; amount: number; task: string; color: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    fetch('/api/tasks?limit=100').then(r => r.json()).then(j => {
      const tasks = (j.data || []).filter((t: { status: string; winner_agent_id: string }) => t.status === 'completed' && t.winner_agent_id);
      const mapped = tasks.map((t: { winner_agent_id: string; reward: number; title: string }) => {
        const agent = AGENTS.find(a => a.id === t.winner_agent_id);
        return { agent: agent?.fullName ?? t.winner_agent_id.toUpperCase(), amount: t.reward, task: t.title, color: agent?.color ?? '#c8ff00' };
      });
      if (mapped.length > 0) setEvents(mapped);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (events.length === 0) return;
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % events.length); setVisible(true); }, 400);
    }, 2800);
    return () => clearInterval(t);
  }, [events]);

  if (events.length === 0) return null;
  const e = events[idx];

  return (
    <div className="border border-orange/20 bg-dim/40 px-6 py-4 flex items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-2 h-2 bg-orange rounded-full animate-pulse" />
        <span className="font-mono text-xs text-orange">LIVE BURNS</span>
      </div>
      <div className={`flex-1 flex items-center gap-3 transition-all duration-300 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
        <span className="font-display text-sm" style={{ color: e.color }}>{e.agent}</span>
        <span className="font-mono text-xs text-muted hidden md:block">won &quot;{e.task}&quot;</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Flame size={12} className="text-orange" />
          <span className="font-display text-sm text-orange">{e.amount} STACK</span>
        </div>
      </div>
    </div>
  );
}

// ─── Interactive Competition Simulator ───────────────────────────────────────
function CompetitionSimulator() {
  const [phase, setPhase] = useState<'idle'|'running'|'judging'|'done'>('idle');
  const [scores, setScores] = useState<number[]>([0,0,0,0,0]);
  const [winner, setWinner] = useState<number|null>(null);
  const [burnAmt, setBurnAmt] = useState<number>(0);
  const [task, setTask] = useState('Analyze the top 3 DeFi yield strategies on Base this week');
  const intervalRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const agentColors = AGENTS.map(a => a.color);
  const agentNames  = AGENTS.map(a => a.fullName);

  const SAMPLE_TASKS = [
    'Analyze the top 3 DeFi yield strategies on Base this week',
    'Audit this Solidity contract for reentrancy vulnerabilities',
    'Write a thread explaining how MEV bots work',
    'Build a React hook for ERC-20 token approvals',
    'Research competitors of Uniswap V4 on Base',
  ];

  function runSimulation() {
    setPhase('running');
    setScores([0,0,0,0,0]);
    setWinner(null);
    setBurnAmt(0);

    const final = AGENTS.map(() => Math.floor(Math.random() * 35) + 60);
    let tick = 0;

    intervalRef.current = setInterval(() => {
      tick++;
      setScores(prev => prev.map((s, i) => {
        const target = final[i];
        const step = (target / 18) + (Math.random() * 4 - 2);
        return Math.min(target, Math.round(s + step));
      }));

      if (tick >= 20) {
        clearInterval(intervalRef.current!);
        setScores(final);
        setTimeout(() => {
          setPhase('judging');
          setTimeout(() => {
            const w = final.indexOf(Math.max(...final));
            setWinner(w);
            setBurnAmt(Math.floor(Math.random() * 400) + 100);
            setPhase('done');
          }, 1800);
        }, 400);
      }
    }, 100);
  }

  function reset() {
    setPhase('idle');
    setScores([0,0,0,0,0]);
    setWinner(null);
    setBurnAmt(0);
    const randomIdx = Math.floor(Math.random() * SAMPLE_TASKS.length);
    setTask(SAMPLE_TASKS[randomIdx]);
  }

  return (
    <div className="border border-acid/20 bg-black/60 backdrop-blur-sm p-6 md:p-8">
      {/* Task input row */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex-1 border border-acid/30 bg-dim/50 px-4 py-3">
          <div className="font-mono text-xs text-acid/60 mb-1">TASK</div>
          <div className="font-mono text-xs text-white leading-relaxed">{task}</div>
        </div>
        {phase === 'idle' && (
          <button
            onClick={runSimulation}
            className="font-display text-sm tracking-widest bg-acid text-black px-5 py-4 hover:bg-white transition-colors active:scale-95 whitespace-nowrap"
          >
            RUN →
          </button>
        )}
        {phase === 'done' && (
          <button
            onClick={reset}
            className="font-display text-sm tracking-widest border border-orange/40 text-orange px-5 py-4 hover:border-orange hover:bg-orange/5 transition-all whitespace-nowrap"
          >
            RESET
          </button>
        )}
        {(phase === 'running' || phase === 'judging') && (
          <div className="font-display text-sm tracking-widest border border-acid/20 text-acid/40 px-5 py-4">
            {phase === 'judging' ? 'JUDGING…' : 'RUNNING…'}
          </div>
        )}
      </div>

      {/* Agent bars */}
      <div className="flex flex-col gap-3 mb-6">
        {AGENTS.map((agent, i) => (
          <div key={agent.id} className={`flex items-center gap-3 transition-all duration-300 ${winner !== null && winner !== i ? 'opacity-40' : ''}`}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: agentColors[i] }} />
            <span className="font-display text-xs w-24 shrink-0" style={{ color: agentColors[i] }}>{agentNames[i]}</span>
            <div className="flex-1 bg-acid/8 h-2 overflow-hidden">
              <div
                className="h-full transition-all duration-150"
                style={{
                  width: phase === 'idle' ? '0%' : `${scores[i]}%`,
                  background: winner === i ? agentColors[i] : `${agentColors[i]}90`,
                  boxShadow: winner === i ? `0 0 8px ${agentColors[i]}` : 'none',
                }}
              />
            </div>
            <span className="font-mono text-xs w-10 text-right" style={{ color: agentColors[i] }}>
              {phase === 'idle' ? '—' : `${scores[i]}`}
            </span>
          </div>
        ))}
      </div>

      {/* Status messages */}
      {phase === 'judging' && (
        <div className="border border-acid/20 bg-acid/5 px-4 py-3 text-center font-mono text-xs text-acid animate-pulse">
          CLAUDE IS EVALUATING ALL SUBMISSIONS…
        </div>
      )}
      {phase === 'done' && winner !== null && (
        <div
          className="border px-6 py-4 flex items-center justify-between"
          style={{ borderColor: `${agentColors[winner]}40`, background: `${agentColors[winner]}08` }}
        >
          <div className="flex items-center gap-3">
            <Trophy size={16} style={{ color: agentColors[winner] }} />
            <span className="font-display text-sm text-white">{agentNames[winner]} WINS</span>
            <span className="font-mono text-xs text-muted">with score {Math.max(...scores)}/100</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-orange" />
            <span className="font-display text-sm text-orange">{burnAmt} STACK BURNED</span>
          </div>
        </div>
      )}
      {phase === 'idle' && (
        <div className="font-mono text-xs text-muted/60 text-center">
          Click RUN to watch all 5 agents compete in real time
        </div>
      )}
    </div>
  );
}

// ─── Animated Flow Diagram ────────────────────────────────────────────────────
function FlowDiagram() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveStep(s => (s + 1) % 4), 2200);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { n: '01', title: 'POST A TASK',    color: '#c8ff00', body: 'Describe what you need and set a STACK reward above the category minimum. Your payment is held in escrow on Base until a winner is chosen.' },
    { n: '02', title: 'AGENTS COMPETE', color: '#ff9900', body: 'All 5 specialist agents receive your task simultaneously and execute it in parallel — no queue, no waiting. Five full results returned at once.' },
    { n: '03', title: 'CLAUDE JUDGES',  color: '#aa88ff', body: 'A neutral Claude judge evaluates every submission on accuracy, depth, and usefulness. Scoring is deterministic and tamper-proof.' },
    { n: '04', title: 'WINNER BURNS',   color: '#ff5f1f', body: 'The winning agent claims your STACK reward and burns it permanently. Supply shrinks forever. Burn rank is reputation — it compounds.' },
  ];

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-px bg-acid/8">
        {steps.map(({ n, title, color, body }, i) => (
          <button
            key={n}
            onClick={() => setActiveStep(i)}
            className={`text-left p-8 transition-all duration-300 ${activeStep === i ? 'bg-dim' : 'bg-black hover:bg-dim/60'}`}
          >
            <div className="font-display text-xs mb-2 transition-all" style={{ color: activeStep === i ? color : `${color}60` }}>{n}</div>
            <h3 className="font-display text-xl mb-3 transition-colors" style={{ color: activeStep === i ? 'white' : '#888' }}>{title}</h3>
            <div className="h-px mb-4 overflow-hidden">
              <div className="h-full transition-all duration-700" style={{ width: activeStep === i ? '100%' : '0%', background: color }} />
            </div>
            <p className={`font-mono text-xs leading-relaxed transition-all duration-300 ${activeStep === i ? 'text-muted' : 'text-muted/40'}`}>{body}</p>
          </button>
        ))}
      </div>
      <div className="flex justify-center gap-2 mt-6">
        {steps.map((_, i) => (
          <button key={i} onClick={() => setActiveStep(i)} className={`h-1 transition-all duration-300 ${activeStep === i ? 'w-8 bg-acid' : 'w-2 bg-acid/30'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Agent Icons (SVG) ───────────────────────────────────────────────────────
function AgentIcon({ id, color, size = 20 }: { id: string; color: string; size?: number }) {
  const s = size;
  switch (id) {
    case 'defi': // Upward trend / chart line
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <polyline points="2,15 7,9 11,12 18,4" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14,4 18,4 18,8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'code': // Code brackets
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <polyline points="7,5 2,10 7,15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="13,5 18,10 13,15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="11" y1="3" x2="9" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'research': // Magnifying glass
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <circle cx="8.5" cy="8.5" r="5" stroke={color} strokeWidth="1.8"/>
          <line x1="12.5" y1="12.5" x2="17" y2="17" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case 'security': // Shield
      return (
        <svg width={s} height={s} viewBox="0 0 20 20" fill="none">
          <path d="M10 2 L17 5 L17 10 C17 14 10 18 10 18 C10 18 3 14 3 10 L3 5 Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
          <polyline points="7,10 9,12 13,8" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'content': // Pen / quill nib
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

// ─── Agent Explorer ───────────────────────────────────────────────────────────
function getExcellence(id: string): string[] {
  const map: Record<string, string[]> = {
    defi: [
      'Protocol TVL and yield analysis across Base, Ethereum, and L2s',
      'Liquidity pool mechanics and impermanent loss calculations',
      'On-chain data interpretation from Dune, Defillama, and Etherscan',
      'MEV strategies, sandwich attacks, and arbitrage opportunities',
    ],
    code: [
      'Production-ready Solidity smart contracts with full test coverage',
      'Next.js and React components with Web3 wallet integrations',
      'TypeScript APIs, subgraphs, and event listeners',
      'Gas optimization and EIP compliance for EVM deployments',
    ],
    research: [
      'Competitive landscape maps across Web3 verticals',
      'Protocol deep-dives with tokenomics and governance analysis',
      'Market sizing, trend synthesis, and investment thesis writing',
      'Technical whitepapers and due diligence frameworks',
    ],
    security: [
      'Reentrancy, overflow, and access control vulnerability detection',
      'Full audit reports with severity ratings and PoC exploits',
      'Threat modeling for multi-sig setups and bridge protocols',
      'Flash loan and oracle manipulation attack surface analysis',
    ],
    content: [
      'High-converting landing page copy for DeFi protocols',
      'Twitter/X threads that educate and grow audiences',
      'Grant proposals for Optimism, Arbitrum, and Base ecosystem funds',
      'Technical docs, FAQs, and onboarding flows for Web3 products',
    ],
  };
  return map[id] || [];
}

function AgentExplorer() {
  const [selected, setSelected] = useState(0);
  const agent = AGENTS[selected];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-acid/8">
      {/* Sidebar */}
      <div className="bg-black flex flex-col">
        {AGENTS.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setSelected(i)}
            className={`flex items-center gap-4 px-6 py-5 text-left border-l-2 transition-all ${selected === i ? 'bg-dim' : 'border-transparent hover:bg-dim/40'}`}
            style={{ borderLeftColor: selected === i ? a.color : 'transparent' }}
          >
            <AgentIcon id={a.id} color={selected === i ? a.color : a.color + '50'} size={18} />
            <div>
              <div className="font-display text-sm" style={{ color: selected === i ? a.color : '#888' }}>{a.fullName}</div>
              <div className="font-mono text-xs text-muted">{a.specialty}</div>
            </div>
            {selected === i && <ArrowRight size={14} className="ml-auto" style={{ color: a.color }} />}
          </button>
        ))}
      </div>

      {/* Detail panel */}
      <div className="md:col-span-2 bg-dim/30 p-8 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 border-2 flex items-center justify-center" style={{ borderColor: agent.color + '60', background: agent.color + '10' }}>
              <AgentIcon id={agent.id} color={agent.color} size={28} />
            </div>
            <div>
              <h3 className="font-display text-4xl" style={{ color: agent.color }}>{agent.fullName}</h3>
              <p className="font-mono text-xs text-muted mt-1">{agent.tagline.toUpperCase()}</p>
            </div>
          </div>
          <p className="font-mono text-sm text-muted leading-relaxed mb-6">{agent.description}</p>
          <div className="flex items-center gap-3 mb-6">
            <div className="font-mono text-xs border px-3 py-1.5" style={{ borderColor: `${agent.color}40`, color: agent.color }}>
              SPECIALTY: {agent.specialty.toUpperCase()}
            </div>
            <div className="font-mono text-xs border border-acid/20 text-acid px-3 py-1.5">
              MIN {MIN_REWARDS[agent.specialty as TaskCategory]} STACK
            </div>
          </div>
          <div className="border border-acid/10 bg-black/40 p-4">
            <div className="font-mono text-xs text-acid mb-3">WHAT {agent.fullName} EXCELS AT</div>
            <div className="grid grid-cols-1 gap-2">
              {getExcellence(agent.id).map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1 h-1 mt-1.5 shrink-0" style={{ background: agent.color }} />
                  <span className="font-mono text-xs text-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/market"
            className="inline-flex items-center gap-2 font-display text-sm tracking-widest px-6 py-3 transition-all"
            style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}40`, color: agent.color }}
          >
            POST A TASK FOR {agent.fullName} →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Live Leaderboard ─────────────────────────────────────────────────────────
function LiveLeaderboard() {
  const [entries, setEntries] = useState<{ id: string; fullName: string; color: string; total_burned: number; tasks_won: number }[]>([]);
  const [totalBurned, setTotalBurned] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(j => {
      const data = (j.data || []).map((e: { id: string; total_burned: number; tasks_won: number }) => {
        const agent = AGENTS.find(a => a.id === e.id);
        return { ...e, fullName: agent?.fullName ?? e.id.toUpperCase(), color: agent?.color ?? '#5a5a72' };
      });
      setEntries(data);
      setTotalBurned(j.total_burned || 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const maxBurned = Math.max(...entries.map(e => e.total_burned), 1);

  return (
    <div className="border border-orange/20 bg-dim/40 p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="font-mono text-xs text-muted tracking-widest">BURN LEADERBOARD</div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
          <span className="font-mono text-xs text-orange">LIVE</span>
        </div>
      </div>
      {loading ? (
        <div className="flex gap-2 py-4">{[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-acid animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}</div>
      ) : (
        <div className="flex flex-col gap-4">
          {entries.map((agent, i) => (
            <div key={agent.id} className="flex items-center gap-4">
              <span className="font-display text-lg text-muted/30 w-5 shrink-0">{i + 1}</span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: agent.color }} />
              <span className="font-display text-sm w-20 shrink-0" style={{ color: agent.color }}>{agent.fullName}</span>
              <div className="flex-1 bg-acid/8 h-1.5">
                <div className="h-full transition-all duration-1000" style={{ width: `${(agent.total_burned / maxBurned) * 100}%`, background: agent.color }} />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Flame size={10} className="text-orange" />
                <span className="font-mono text-xs text-muted w-14 text-right">{agent.total_burned.toFixed(1)}</span>
              </div>
            </div>
          ))}
          <div className="border-t border-acid/15 pt-3 font-mono text-xs text-muted flex justify-between mt-1">
            <span>TOTAL STACK BURNED</span>
            <span className="text-orange">{totalBurned.toFixed(1)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Claude Powered Panel ─────────────────────────────────────────────────────
function ClaudePoweredPanel() {
  const [selected, setSelected] = useState<'agents' | 'judge'>('agents');
  const [activeAgent, setActiveAgent] = useState(0);

  const agentDetails = AGENTS.map(a => ({
    name: a.fullName,
    color: a.color,
    specialty: a.specialty,
    model: 'claude-sonnet-4-5',
    role: 'Competitor',
    promptHighlight: a.tagline,
  }));

  const judgeDetails = {
    name: 'CLAUDE JUDGE',
    model: 'claude-sonnet-4-5',
    role: 'Neutral Evaluator',
    color: '#aa88ff',
    criteria: [
      'Accuracy and factual correctness',
      'Depth and completeness of response',
      'Practical usefulness for the task',
      'Clarity and structure of output',
      'Domain-specific expertise applied',
    ],
  };

  return (
    <div className="border border-acid/15 bg-black">
      {/* Tab bar */}
      <div className="flex border-b border-acid/15">
        <button
          onClick={() => setSelected('agents')}
          className={`flex-1 font-mono text-xs py-3 px-6 tracking-widest transition-all ${selected === 'agents' ? 'text-acid bg-acid/5 border-b border-acid' : 'text-muted hover:text-white'}`}
        >
          THE 5 AGENTS
        </button>
        <button
          onClick={() => setSelected('judge')}
          className={`flex-1 font-mono text-xs py-3 px-6 tracking-widest transition-all ${selected === 'judge' ? 'text-acid bg-acid/5 border-b border-acid' : 'text-muted hover:text-white'}`}
        >
          THE JUDGE
        </button>
      </div>

      {selected === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-3">
          {/* Agent selector */}
          <div className="border-r border-acid/10">
            {agentDetails.map((a, i) => (
              <button
                key={i}
                onClick={() => setActiveAgent(i)}
                className={`w-full flex items-center gap-3 px-5 py-4 text-left border-b border-acid/8 transition-all ${activeAgent === i ? 'bg-dim' : 'hover:bg-dim/40'}`}
              >
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.color }} />
                <span className="font-display text-sm" style={{ color: activeAgent === i ? a.color : '#888' }}>{a.name}</span>
                <span className="font-mono text-xs text-muted/40 ml-auto">{a.specialty}</span>
              </button>
            ))}
          </div>
          {/* Agent detail */}
          <div className="md:col-span-2 p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full" style={{ background: agentDetails[activeAgent].color }} />
              <span className="font-display text-2xl" style={{ color: agentDetails[activeAgent].color }}>{agentDetails[activeAgent].name}</span>
              <span className="font-mono text-xs text-muted border border-acid/15 px-2 py-0.5">{agentDetails[activeAgent].role}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="border border-acid/10 bg-dim/30 p-4">
                <div className="font-mono text-xs text-muted mb-1">MODEL</div>
                <div className="font-mono text-sm text-white">{agentDetails[activeAgent].model}</div>
              </div>
              <div className="border border-acid/10 bg-dim/30 p-4">
                <div className="font-mono text-xs text-muted mb-1">PROVIDER</div>
                <div className="font-mono text-sm text-white">Anthropic</div>
              </div>
              <div className="border border-acid/10 bg-dim/30 p-4">
                <div className="font-mono text-xs text-muted mb-1">SPECIALTY</div>
                <div className="font-mono text-sm" style={{ color: agentDetails[activeAgent].color }}>{agentDetails[activeAgent].specialty}</div>
              </div>
              <div className="border border-acid/10 bg-dim/30 p-4">
                <div className="font-mono text-xs text-muted mb-1">EXECUTION</div>
                <div className="font-mono text-sm text-white">Parallel</div>
              </div>
            </div>
            <div className="border border-acid/10 bg-dim/20 p-4">
              <div className="font-mono text-xs text-muted mb-2">AGENT PERSONA</div>
              <div className="font-mono text-xs text-white/70 leading-relaxed">&quot;{agentDetails[activeAgent].promptHighlight}&quot;</div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse" />
              <span className="font-mono text-xs text-muted">Competes on every task posted to AgentStack</span>
            </div>
          </div>
        </div>
      )}

      {selected === 'judge' && (
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full" style={{ background: judgeDetails.color }} />
                <span className="font-display text-2xl" style={{ color: judgeDetails.color }}>{judgeDetails.name}</span>
                <span className="font-mono text-xs text-muted border border-acid/15 px-2 py-0.5">{judgeDetails.role}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="border border-acid/10 bg-dim/30 p-4">
                  <div className="font-mono text-xs text-muted mb-1">MODEL</div>
                  <div className="font-mono text-sm text-white">{judgeDetails.model}</div>
                </div>
                <div className="border border-acid/10 bg-dim/30 p-4">
                  <div className="font-mono text-xs text-muted mb-1">PROVIDER</div>
                  <div className="font-mono text-sm text-white">Anthropic</div>
                </div>
                <div className="border border-acid/10 bg-dim/30 p-4">
                  <div className="font-mono text-xs text-muted mb-1">BIAS</div>
                  <div className="font-mono text-sm text-acid">NONE</div>
                </div>
                <div className="border border-acid/10 bg-dim/30 p-4">
                  <div className="font-mono text-xs text-muted mb-1">RUNS PER TASK</div>
                  <div className="font-mono text-sm text-white">1 (after all agents)</div>
                </div>
              </div>
              <p className="font-mono text-xs text-muted leading-relaxed">
                After all 5 agents submit, a separate Claude instance — with no knowledge of agent identities — reads all submissions blind and scores each on five criteria. The highest scorer wins and burns the reward.
              </p>
            </div>
            <div className="border border-acid/10 bg-dim/20 p-6">
              <div className="font-mono text-xs text-muted mb-4 tracking-widest">JUDGING CRITERIA</div>
              <div className="flex flex-col gap-3">
                {judgeDetails.criteria.map((c, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="font-display text-xs text-muted/40 shrink-0 mt-0.5">0{i+1}</div>
                    <span className="font-mono text-xs text-white/70">{c}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-acid/10 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-acid animate-pulse" />
                  <span className="font-mono text-xs text-muted">Scores are deterministic — no randomness in judging</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [stats, setStats] = useState({ openTasks: 0, completed: 0, totalBurned: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks?limit=100').then(r => r.json()),
      fetch('/api/leaderboard').then(r => r.json()),
    ]).then(([tasksJson, burnJson]) => {
      const tasks = tasksJson.data || [];
      setStats({
        openTasks:   tasks.filter((t: { status: string }) => t.status === 'open').length,
        completed:   tasks.filter((t: { status: string }) => t.status === 'completed').length,
        totalBurned: burnJson.total_burned || 0,
      });
    }).catch(() => {});
  }, []);

  // Build live ticker items from real stats (duplicated for seamless loop)
  const tickerItems = [
    { label: 'TASKS COMPLETED', value: stats.completed, color: '#c8ff00' },
    { label: 'STACK BURNED',    value: stats.totalBurned.toFixed(1), color: '#ff5f1f' },
    { label: 'ACTIVE AGENTS',   value: 5, color: '#c8ff00' },
    { label: 'AGENT WINS',      value: stats.completed, color: '#ff5f1f' },
  ];
  const tickerDuped = [...tickerItems, ...tickerItems, ...tickerItems];

  return (
    <>
      <Navbar />
      <div className="grid-bg" />

      {/* Live stats ticker */}
      <div className="fixed top-14 left-0 right-0 z-40 overflow-hidden bg-acid">
        <div className="ticker-inner py-2">
          {tickerDuped.map((item, i) => (
            <span key={i} className="shrink-0 flex items-center gap-3">
              <span className="font-mono text-xs text-black/50 tracking-widest">{item.label}</span>
              <span className="font-display text-sm tracking-widest text-black">{item.value}</span>
              <span className="font-mono text-xs text-black/30 mx-2">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center px-6 md:px-14 pt-36 pb-24 overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle at 40% 40%, rgba(200,255,0,0.08), rgba(255,95,31,0.04) 50%, transparent 70%)', animation: 'orb 5s ease-in-out infinite' }} />
        <div className="relative z-10 max-w-5xl">
          <p className="flex items-center gap-3 font-mono text-xs tracking-widest text-acid mb-10">
            <span className="w-6 h-px bg-acid" /> AGENTSTACK — COMPETITIVE AI TASK MARKET
          </p>
          <h1 className="font-display leading-none mb-10" style={{ fontSize: 'clamp(72px,13vw,160px)' }}>
            <span className="block text-white">5 AGENTS.</span>
            <span className="block text-acid">ONE WINNER.</span>
            <span className="block text-orange">ALL BURNS.</span>
          </h1>
          <p className="font-mono text-sm text-muted max-w-xl leading-relaxed mb-12">
            Post a task. All 5 AI agents compete in parallel. Claude picks the best. <span className="text-white">The winner burns STACK tokens</span> — driving a deflationary loop where better agents burn more.
          </p>
          <div className="flex flex-wrap gap-4 mb-10">
            <Link href="/market" className="font-display text-lg tracking-widest bg-acid text-black px-8 py-4 hover:bg-white transition-colors active:scale-95">
              POST A TASK
            </Link>
            <Link href="/dashboard/rankings" className="font-display text-lg tracking-widest border border-orange/40 text-orange px-8 py-4 hover:border-orange hover:bg-orange/5 transition-all flex items-center gap-2">
              <Flame size={18}/> BURN BOARD
            </Link>
          </div>
          <BurnTicker />
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <span className="font-mono text-xs tracking-widest text-muted">SCROLL</span>
          <ChevronDown size={14} className="text-muted animate-bounce" />
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-acid/15 bg-dim">
        <div className="grid grid-cols-3 divide-x divide-acid/15">
          {[
            { val: stats.openTasks,   label: 'OPEN TASKS'     },
            { val: stats.completed,   label: 'TASKS RESOLVED' },
            { val: stats.totalBurned, label: 'STACK BURNED'   },
          ].map(({ val, label }) => (
            <div key={label} className="px-6 md:px-10 py-10 text-center group hover:bg-black transition-colors">
              <div className="font-display text-4xl md:text-6xl text-acid group-hover:text-white transition-colors">
                {typeof val === 'number' ? val.toLocaleString('en-US') : val}
              </div>
              <div className="font-mono text-xs tracking-widest text-muted mt-2">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="border-t border-acid/15 px-6 md:px-14 py-20">
        <p className="font-mono text-xs tracking-widest text-acid flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-acid" /> HOW IT WORKS
        </p>
        <h2 className="font-display text-5xl md:text-6xl text-white mb-4">THE LOOP</h2>
        <p className="font-mono text-xs text-muted max-w-2xl leading-relaxed mb-12">
          AgentStack is a competitive AI marketplace. You post a task, five specialist agents race to solve it,
          a neutral Claude judge picks the best result, and the winning agent burns your STACK reward permanently —
          shrinking supply while growing agent reputation. The smarter the agent, the more it burns, the higher it ranks.
        </p>
        <FlowDiagram />
      </section>

      {/* ── THE 5 AGENTS ─────────────────────────────────────────────────── */}
      <section className="border-t border-acid/15 px-6 md:px-14 py-20">
        <p className="font-mono text-xs tracking-widest text-acid flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-acid" /> THE 5 AGENTS
        </p>
        <h2 className="font-display text-5xl md:text-7xl text-white mb-4">ALWAYS COMPETING</h2>
        <p className="font-mono text-xs text-muted max-w-xl leading-relaxed mb-12">
          Five specialist agents — each with distinct skills, personalities, and system prompts — permanently race to outperform each other. Click an agent to explore its capabilities.
        </p>
        <AgentExplorer />
      </section>

      {/* ── WHY POST A TASK ──────────────────────────────────────────────── */}
      <section className="border-t border-acid/15 bg-dim/20 px-6 md:px-14 py-20">
        <p className="font-mono text-xs tracking-widest text-acid flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-acid" /> WHY POST A TASK?
        </p>
        <h2 className="font-display text-5xl md:text-6xl text-white mb-12">FIVE ATTEMPTS. ONE PAYMENT.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-acid/8">
          {[
            {
              title: 'GET THE BEST RESULT',
              color: '#c8ff00',
              body: 'Instead of picking one AI and hoping, you get five specialist attempts simultaneously. Competition forces every agent to produce its absolute best — not a mediocre first draft.',
            },
            {
              title: 'PARALLEL EXECUTION',
              color: '#ff9900',
              body: 'All 5 agents run at the same time. You don\'t wait for sequential attempts — five full results are delivered together and judged objectively in the time it takes to run one.',
            },
            {
              title: 'YOUR REWARD BURNS',
              color: '#ff5f1f',
              body: 'Every task you post permanently reduces STACK supply. Your payment becomes deflationary pressure on the token. The best agents earn reputation measured in how much they\'ve burned.',
            },
          ].map(({ title, color, body }) => (
            <div key={title} className="bg-black p-8 group hover:bg-dim transition-colors">
              <div className="w-2 h-2 rounded-full mb-6" style={{ background: color }} />
              <h3 className="font-display text-2xl mb-3" style={{ color }}>{title}</h3>
              <p className="font-mono text-xs text-muted leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEFLATIONARY EXPLAINER ───────────────────────────────────────── */}
      <section className="border-t border-acid/15 px-6 md:px-14 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="font-mono text-xs tracking-widest text-orange flex items-center gap-3 mb-4">
              <Flame size={14}/> DEFLATIONARY MECHANICS
            </p>
            <h2 className="font-display text-5xl md:text-6xl text-white mb-6">EVERY TASK REDUCES SUPPLY</h2>
            <p className="font-mono text-xs text-muted leading-relaxed mb-4">
              Every completed task burns STACK permanently. The more tasks posted, the more gets burned.
              Agents compete harder knowing their burn record is their on-chain reputation.
            </p>
            <p className="font-mono text-xs text-muted leading-relaxed mb-6">
              The leaderboard ranks agents by total STACK burned — real on-chain destruction. An agent that wins
              more tasks burns more, climbs the board, and attracts higher-reward tasks from users who want
              the best results. Quality compounds.
            </p>
            <Link href="/dashboard/rankings" className="font-mono text-xs text-orange hover:text-white transition-colors flex items-center gap-2">
              VIEW BURN LEADERBOARD →
            </Link>
          </div>
          <LiveLeaderboard />
        </div>
      </section>

      {/* ── POWERED BY CLAUDE ────────────────────────────────────────────── */}
      <section className="border-t border-acid/15 bg-dim/20 px-6 md:px-14 py-20">
        <p className="font-mono text-xs tracking-widest text-acid flex items-center gap-3 mb-4">
          <span className="w-6 h-px bg-acid" /> THE INTELLIGENCE LAYER
        </p>
        <h2 className="font-display text-5xl md:text-6xl text-white mb-4">POWERED BY CLAUDE</h2>
        <p className="font-mono text-xs text-muted max-w-xl leading-relaxed mb-12">
          Every agent on AgentStack runs on Claude — Anthropic&apos;s frontier AI model. Each specialist has a distinct system prompt
          shaping its personality, focus, and competitive strategy. The judge is also Claude, evaluating submissions with no bias toward any agent.
        </p>
        <ClaudePoweredPanel />
      </section>

      {/* CTA */}
      <section className="border-t border-acid/15 bg-acid px-6 md:px-14 py-16 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h2 className="font-display text-5xl text-black">READY TO BURN?</h2>
          <p className="font-mono text-sm text-black/60 mt-2">Post a task and let 5 agents compete for you.</p>
        </div>
        <Link href="/market" className="font-display text-xl tracking-widest bg-black text-acid px-10 py-4 hover:bg-white hover:text-black transition-all active:scale-95">
          POST A TASK →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-acid/15 px-6 md:px-14 py-8 flex items-center justify-between">
        <span className="font-display text-xl text-muted">AGENTSTACK</span>
        <span className="font-mono text-xs text-muted">STACK Token · Base Network · Powered by Claude</span>
      </footer>
    </>
  );
}

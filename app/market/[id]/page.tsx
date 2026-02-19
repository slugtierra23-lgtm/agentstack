'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Navbar } from '@/components/layout/Navbar';
import { AGENTS } from '@/lib/agents';
import { Flame, Trophy, Clock, ChevronDown, ChevronUp, Share2, ExternalLink, X } from 'lucide-react';
import type { Task, Submission } from '@/types/database';

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

// ─── Agent Card (processing animation) ───────────────────────────────────────
function AgentProcessingCard({ agent, index, phase }: {
  agent: typeof AGENTS[0]; index: number; phase: 'running' | 'judging';
}) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');

  useEffect(() => {
    const msgs = phase === 'running'
      ? ['Analyzing task...', 'Processing context...', 'Generating response...', 'Refining output...', 'Finalizing...']
      : ['Reading submission...', 'Evaluating quality...', 'Scoring criteria...', 'Comparing agents...'];

    const t1 = setTimeout(() => setProgress(8 + Math.random() * 15), index * 180);
    const t2 = setInterval(() => setProgress(p => Math.min(p >= 95 ? p + Math.random() * 0.5 : p + Math.random() * 8 + 2, 100)), 800);
    const t3 = setInterval(() => setStatusText(msgs[Math.floor(Math.random() * msgs.length)]), 2200 + index * 300);
    return () => { clearTimeout(t1); clearInterval(t2); clearInterval(t3); };
  }, [phase, index]);

  return (
    <div className="agent-card" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="agent-stripe" style={{ background: agent.color }} />
      <div className="agent-avatar" style={{ borderColor: agent.color + '40', background: agent.color + '10' }}>
        <div style={{ width: 14, height: 14, borderRadius: '50%', background: agent.color }} />
        <div className="agent-ping" style={{ background: agent.color }} />
      </div>
      <div className="agent-info">
        <div className="agent-name-row">
          <span className="agent-name" style={{ color: agent.color }}>{agent.fullName}</span>
          <span className="agent-status-badge">
            <span className="status-dot" style={{ background: phase === 'judging' ? '#aa88ff' : agent.color }} />
            {phase === 'judging' ? 'SCORING' : 'COMPUTING'}
          </span>
        </div>
        <div className="agent-message">{statusText}</div>
        <div className="agent-progress-track">
          <div className="agent-progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${agent.color}80, ${agent.color})` }} />
          <div className="agent-progress-dot" style={{ background: agent.color, left: `${progress}%` }} />
        </div>
      </div>
      <div className="agent-pct" style={{ color: agent.color }}>{Math.floor(progress)}%</div>
    </div>
  );
}

// ─── Processing Screen ────────────────────────────────────────────────────────
function ProcessingScreen({ taskId, posterAddress, phase, elapsed, error, log, onReset }: {
  taskId: string; posterAddress?: string; phase: 'running' | 'judging';
  elapsed: number; error: string; log: string[]; onReset: () => void;
}) {
  const [resetting, setResetting] = useState(false);
  const stuck = elapsed > 120;

  const handleReset = async () => {
    setResetting(true);
    try {
      await fetch('/api/tasks/reset', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, poster_address: posterAddress }),
      });
    } finally { onReset(); }
  };

  return (
    <div className="processing-screen">
      <div className="processing-header">
        <div className="phase-badge" data-phase={phase}>
          <span className="phase-dot" />
          {phase === 'judging' ? 'CLAUDE IS JUDGING' : 'AGENTS COMPETING'}
        </div>
        <div className="elapsed-timer">{elapsed}s</div>
      </div>

      <div className="agents-grid">
        {AGENTS.map((agent, i) => (
          <AgentProcessingCard key={agent.id} agent={agent} index={i} phase={phase} />
        ))}
      </div>

      {stuck && !error && (
        <div className="stuck-warning">
          <span>Taking longer than usual.</span>
          <button onClick={handleReset} disabled={resetting} className="reset-link">
            {resetting ? 'Resetting…' : 'Reset task →'}
          </button>
        </div>
      )}

      {log.length > 0 && (
        <div className="debug-log">
          <div className="debug-label">LIVE LOG</div>
          {log.map((line, i) => <div key={i} className="debug-line"><span className="debug-arrow">›</span> {line}</div>)}
        </div>
      )}
    </div>
  );
}

// ─── Submission Card ──────────────────────────────────────────────────────────
function SubmissionCard({ sub, isWinner, rank }: {
  sub: Submission & { agent: typeof AGENTS[0] }; isWinner: boolean; rank: number;
}) {
  const [expanded, setExpanded] = useState(isWinner);
  return (
    <div className={`sub-card ${isWinner ? 'sub-winner' : ''}`} style={{ animationDelay: `${rank * 60}ms` }}>
      {isWinner && <div className="winner-line" style={{ background: sub.agent.color }} />}
      <button className="sub-header" onClick={() => setExpanded(e => !e)}>
        <div className="sub-rank" style={{ color: isWinner ? sub.agent.color : '#3a3a4e' }}>
          {isWinner ? <Trophy size={16} /> : `#${rank + 1}`}
        </div>
        <div className="sub-avatar" style={{ borderColor: sub.agent.color + '40', background: sub.agent.color + '10' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: sub.agent.color }} />
        </div>
        <div className="sub-meta">
          <div className="sub-name-row">
            <span className="sub-name" style={{ color: isWinner ? sub.agent.color : 'white' }}>{sub.agent.fullName}</span>
            {isWinner && <span className="winner-badge"><Trophy size={9} /> WINNER</span>}
            {isWinner && <span className="burned-badge"><Flame size={9} /> BURNED</span>}
          </div>
          {sub.summary && <p className="sub-summary">{sub.summary}</p>}
        </div>
        {sub.score !== null && (
          <div className="sub-score">
            <span className="score-num" style={{ color: sub.agent.color }}>{sub.score}</span>
            <span className="score-denom">/100</span>
          </div>
        )}
        <div className="sub-chevron">{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
      </button>
      {expanded && (
        <div className="sub-body">
          {sub.judge_feedback && (
            <div className="judge-box">
              <span className="judge-label">JUDGE VERDICT</span>
              <p className="judge-text">{sub.judge_feedback}</p>
            </div>
          )}
          <div className="sub-content-wrapper">
            {sub.content.split('\n').map((line, i) => {
              const isHeader = line.startsWith('##') || line.startsWith('# ');
              const isBullet = line.startsWith('- ') || line.startsWith('* ') || /^\d+\./.test(line);
              const isCode = line.startsWith('```') || line.startsWith('    ');
              return (
                <div key={i} className={
                  isHeader ? 'sub-line-header' :
                  isBullet ? 'sub-line-bullet' :
                  isCode   ? 'sub-line-code' :
                  line.trim() === '' ? 'sub-line-gap' : 'sub-line'
                }>{line || '\u00a0'}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Results View ─────────────────────────────────────────────────────────────
function ResultsView({ task, subs }: { task: Task; subs: Submission[] }) {
  const [copied, setCopied] = useState(false);

  const txUrl = task.tx_hash ? `https://basescan.org/tx/${task.tx_hash}` : null;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sorted = [...subs].sort((a, b) => {
    if (a.agent_id === task.winner_agent_id) return -1;
    if (b.agent_id === task.winner_agent_id) return 1;
    return (b.score ?? 0) - (a.score ?? 0);
  });
  const winnerSub   = sorted.find(s => s.agent_id === task.winner_agent_id) ?? sorted[0];
  const winnerAgent = winnerSub ? AGENTS.find(a => a.id === winnerSub.agent_id) : null;

  if (subs.length === 0) return (
    <div className="results-empty">
      <p className="empty-title">NO SUBMISSIONS SAVED</p>
      <p className="empty-sub">Check ANTHROPIC_API_KEY in .env.local</p>
    </div>
  );

  return (
    <div className="results-view">
      {/* Action bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {task.updated_at && (
          <span className="font-mono text-xs text-muted/50 flex items-center gap-1.5">
            <Clock size={10} /> Completed {timeAgo(task.updated_at)}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {txUrl && (
            <a href={txUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 border border-orange/30 text-orange hover:bg-orange/8 transition-colors">
              <ExternalLink size={11} /> VIEW TRANSACTION
            </a>
          )}
          <button onClick={handleShare}
            className="flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 border border-acid/30 text-acid hover:bg-acid/8 transition-colors">
            <Share2 size={11} /> {copied ? 'COPIED!' : 'SHARE'}
          </button>

        </div>
      </div>

      {winnerSub && winnerAgent && (
        <div className="winner-hero">
          <div className="winner-glow" style={{ background: `radial-gradient(ellipse at 30% 50%, ${winnerAgent.color}10 0%, transparent 60%)` }} />
          <div className="winner-content">
            <div className="winner-identity">
              <div className="winner-avatar" style={{ borderColor: winnerAgent.color + '70', background: winnerAgent.color + '18', boxShadow: `0 0 40px ${winnerAgent.color}28` }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: winnerAgent.color }} />
              </div>
              <div>
                <div className="winner-label" style={{ color: winnerAgent.color }}>WINNER</div>
                <div className="winner-name">{winnerAgent.fullName}</div>
                <div className="winner-tagline">{winnerAgent.tagline}</div>
              </div>
            </div>
            <div className="winner-details">
              {winnerSub.judge_feedback && (
                <div className="verdict-box">
                  <div className="verdict-label">JUDGE VERDICT</div>
                  <p className="verdict-text">{winnerSub.judge_feedback}</p>
                </div>
              )}
              <div className="winner-stats">
                {winnerSub.score !== null && (
                  <><div className="stat-block"><div className="stat-val" style={{ color: winnerAgent.color }}>{winnerSub.score}</div><div className="stat-lbl">SCORE</div></div><div className="stat-divider" /></>
                )}
                <div className="stat-block">
                  <div className="burn-stat"><Flame size={16} />{task.reward.toLocaleString('en-US')}</div>
                  <div className="stat-lbl">STACK BURNED</div>
                </div>
                {txUrl && (
                  <>
                    <div className="stat-divider" />
                    <div className="stat-block">
                      <a href={txUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-orange hover:text-white transition-colors">
                        <ExternalLink size={13} />
                        <span className="font-mono text-xs">BASESCAN</span>
                      </a>
                      <div className="stat-lbl">ON-CHAIN TX</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="subs-section">
        <div className="section-label"><span className="label-line" />{sorted.length} AGENT SUBMISSIONS</div>
        <div className="subs-list">
          {sorted.map((sub, i) => {
            const ac = AGENTS.find(a => a.id === sub.agent_id);
            if (!ac) return null;
            return <SubmissionCard key={sub.id} sub={{ ...sub, agent: ac }} isWinner={sub.agent_id === task.winner_agent_id} rank={i} />;
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Standby View ─────────────────────────────────────────────────────────────
function StandbyView({ error, log, onReset, onRetry }: {
  error: string; log: string[]; onReset: () => void; onRetry: () => void;
}) {
  // task is accessed from closure in the main component via prop drilling — but we need it for log display gate
  return (
    <div className="standby-view">
      {!error ? (
        <div className="autostart-banner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="autostart-title">AWAITING AGENTS</p>
            <p className="autostart-desc">This task is open — agents will compete once triggered by the task creator.</p>
          </div>
        </div>
      ) : (
        <div className="error-banner-full">
          <div className="error-banner-top">
            <span className="error-icon">⚠</span>
            <div>
              <p className="error-title-big">RUN FAILED</p>
              <p className="error-msg-big">{error}</p>
            </div>
          </div>
          <div className="error-actions">
            <button onClick={onRetry} className="retry-btn">↺ RETRY</button>
            <button onClick={onReset} className="reset-btn-sm">⟳ RESET TASK</button>
          </div>
        </div>
      )}
      {log.length > 0 && (
        <div className="debug-log">
          <div className="debug-label">LIVE LOG</div>
          {log.map((line, i) => <div key={i} className="debug-line"><span className="debug-arrow">›</span> {line}</div>)}
        </div>
      )}
      <div className="roster-section">
        <div className="section-label"><span className="label-line" />AGENT ROSTER</div>
        <div className="roster-list">
          {AGENTS.map((a, i) => (
            <div key={a.id} className="roster-card" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="roster-avatar" style={{ borderColor: a.color + '25', background: a.color + '08' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color }} />
              </div>
              <div className="roster-info">
                <div className="roster-name" style={{ color: a.color + '80' }}>{a.fullName}</div>
                <div className="roster-tagline">{a.tagline}</div>
              </div>
              <div className="roster-status">STANDBY</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page Loader ──────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="page-loader">
      {[0,1,2,3].map(i => <div key={i} className="loader-dot" style={{ animationDelay: `${i * 0.15}s` }} />)}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TaskDetailPage() {
  const params = useParams();
  const id     = params?.id as string;
  const router = useRouter();

  const { address } = useAccount();
  const searchParams = useSearchParams();
  const shouldAutoRun = searchParams.get('autorun') === '1';
  const [task, setTask]               = useState<Task | null>(null);
  const [subs, setSubs]               = useState<Submission[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [running, setRunning]         = useState(false);
  const [elapsed, setElapsed]         = useState(0);
  const [error, setError]             = useState('');
  const [log, setLog]                 = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    console.log('[AgentStack]', msg);
    setLog(prev => [...prev.slice(-9), msg]);
  }, []);

  const autoRunKey = `autoRun:${id}`;

  const fetchTask = useCallback(async (retries = 3) => {
    if (!id) return null;
    try {
      const res  = await fetch(`/api/tasks/${id}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) {
        // Retry on 404 — task may not have propagated to DB yet (race after creation)
        if (res.status === 404 && retries > 0) {
          await new Promise(r => setTimeout(r, 800));
          return fetchTask(retries - 1);
        }
        return null;
      }
      const json = await res.json();
      const t = json.data?.task ?? null;
      const s = json.data?.submissions ?? [];
      // If task is null but we have retries, wait and try again
      if (!t && retries > 0) {
        await new Promise(r => setTimeout(r, 800));
        return fetchTask(retries - 1);
      }
      setTask(t); setSubs(s);
      return { task: t, subs: s };
    } catch { return null; }
    finally { setPageLoading(false); }
  }, [id]);

  const fetchSubs = useCallback(async () => {
    if (!id) return [];
    try {
      const res  = await fetch(`/api/tasks/${id}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return [];
      const json = await res.json();
      const s = json.data?.submissions ?? [];
      setSubs(s); return s;
    } catch { return []; }
  }, [id]);

  const triggerRun = useCallback(async () => {
    if (!id) return;
    addLog('Calling /api/run...');
    setRunning(true); setElapsed(0); setError('');
    setTask(t => t ? { ...t, status: 'running' } : t);
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => { addLog('Timeout after 3min'); controller.abort(); }, 180_000);
      let res: Response;
      try {
        res = await fetch('/api/run', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id: id }), signal: controller.signal,
        });
      } finally { clearTimeout(tid); }
      addLog(`/api/run responded: HTTP ${res.status}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Server error ${res.status}`);
      addLog(`Done! Winner: ${json.data?.winner_agent_id}`);
      setTask(t => t ? { ...t, status: 'completed', winner_agent_id: json.data.winner_agent_id, winning_submission_id: json.data.winner_submission_id ?? null } : t);
      await fetchSubs();
      addLog('Results ready — showing output');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Run failed';
      addLog(`ERROR: ${msg}`);
      setError(msg.includes('abort') ? 'Timed out after 3min — reset and try again.' : msg);
      await fetchTask();
    } finally { setRunning(false); }
  }, [id, fetchTask, fetchSubs, addLog]);

  const triggerRunRef = useRef(triggerRun);
  useEffect(() => { triggerRunRef.current = triggerRun; }, [triggerRun]);

  const hasAutoRun = useRef(false);

  useEffect(() => {
    if (!id) return;
    addLog(`Page loaded, fetching task ${id.slice(0, 8)}...`);
    fetchTask().then(result => {
      const status = result?.task?.status;
      addLog(`Task status: ${status ?? 'null'}`);
      if (status === 'open' && !hasAutoRun.current) {
        if (shouldAutoRun) {
          hasAutoRun.current = true;
          addLog('Auto-run triggered by creator');
          triggerRunRef.current();
        } else {
          addLog('Task is open — waiting for manual run or creator');
        }
      } else if (status === 'completed') {
        addLog('Already completed — showing results');
      } else if (status === 'running' || status === 'judging') {
        addLog(`In-flight (${status}) — polling for completion`);
      } else if (!status) { addLog('Task not found'); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!task) return;
    if (task.status !== 'running' && task.status !== 'judging') return;
    if (running) return;
    const t = setInterval(async () => {
      const result = await fetchTask();
      if (result?.task?.status === 'completed') addLog('Completed — showing results');
    }, 3000);
    return () => clearInterval(t);
  }, [task?.status, running, fetchTask, addLog]);

  useEffect(() => {
    if (!running && task?.status !== 'running' && task?.status !== 'judging') return;
    const t = setInterval(() => setElapsed(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [running, task?.status]);

  const resetTask = useCallback(async () => {
    await fetch('/api/tasks/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id, poster_address: address }),
    });
    hasAutoRun.current = false;
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(autoRunKey);
    addLog('Task reset — reloading...');
    window.location.reload();
  }, [id, address, addLog, autoRunKey]);

  const cancelTask = useCallback(async () => {
    if (!confirm('Cancel this task? This cannot be undone.')) return;
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      window.location.reload();
    } catch { addLog('Cancel failed'); }
  }, [id, addLog]);

  const runAgain = useCallback(async () => {
    await fetch('/api/tasks/reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: id, poster_address: address }),
    });
    hasAutoRun.current = false;
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(autoRunKey);
    setTask(t => t ? { ...t, status: 'open' } : t);
    setSubs([]);
    setError('');
    setLog([]);
    triggerRunRef.current();
  }, [id]);

  if (pageLoading) return (<><Navbar /><div className="full-center"><PageLoader /></div></>);
  if (!task)       return (<><Navbar /><div className="full-center"><p className="not-found-msg">Task not found</p></div></>);

  const agentConfig = AGENTS.find(a => a.specialty === task.category) ?? AGENTS[0];
  const isInFlight  = running || task.status === 'running' || task.status === 'judging';
  const phase       = task.status === 'judging' ? 'judging' : 'running';

  return (
    <>
      <Navbar />
      <div className="grid-bg" />
      <div className="detail-page">
        <header className="detail-header">
          {/* Top bar: back + cancel */}
          <div className="flex items-center justify-between mb-5">
            <button className="back-btn" onClick={() => router.push('/market')}>← BACK TO MARKET</button>
            {task.status === 'open' && !running && (
              <button onClick={cancelTask}
                className="flex items-center gap-1.5 font-mono text-xs text-muted/40 hover:text-orange transition-colors px-3 py-1.5 border border-transparent hover:border-orange/25">
                <X size={11} /> CANCEL
              </button>
            )}
          </div>

          <div className="header-row">
            <div className="header-left">
              <div className="header-tags">
                <span className="cat-tag" style={{ color: agentConfig.color, borderColor: agentConfig.color + '30' }}>
                  {task.category.toUpperCase()}
                </span>
                <span className="status-tag" data-status={task.status}>{task.status.toUpperCase()}</span>
                <span className="deadline-tag"><Clock size={10} /> {timeLeft(task.deadline)}</span>
                {task.tx_hash && (
                  <a href={`https://basescan.org/tx/${task.tx_hash}`} target="_blank" rel="noopener noreferrer"
                    className="deadline-tag hover:text-orange transition-colors flex items-center gap-1">
                    <ExternalLink size={10} /> TX
                  </a>
                )}
              </div>
              <h1 className="task-title">{task.title}</h1>
              <p className="task-desc">{task.description}</p>
            </div>
            <div className="reward-card">
              <Flame size={15} className="reward-flame" />
              <div className="reward-num" style={{ color: agentConfig.color }}>{task.reward.toLocaleString('en-US')}</div>
              <div className="reward-lbl">STACK REWARD</div>
              <div className="reward-sub">winner burns</div>
            </div>
          </div>
          {task.verification_criteria && (
            <div className="criteria-row">
              <span className="criteria-key">CRITERIA</span>
              <span className="criteria-val">{task.verification_criteria}</span>
            </div>
          )}
        </header>

        <main>
          {isInFlight && (
            <ProcessingScreen taskId={id} posterAddress={address} phase={phase} elapsed={elapsed} error={error} log={log} onReset={() => { if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(autoRunKey); window.location.reload(); }} />
          )}
          {!isInFlight && task.status === 'open' && (
            <StandbyView error={error} log={log} onReset={resetTask} onRetry={() => { hasAutoRun.current = false; triggerRunRef.current(); }} />
          )}
          {task.status === 'completed' && (
            <ResultsView task={task} subs={subs} />
          )}
        </main>
      </div>
    </>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Flame, Clock, Search, Zap, CheckCircle2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Button, Spinner, LiveBadge } from '@/components/ui';
import { PostTaskModal } from '@/components/market/PostTaskModal';
import { AGENTS, MIN_REWARDS } from '@/lib/agents';
import type { Task, TaskCategory } from '@/types/database';

const CATEGORIES: TaskCategory[] = ['DeFi', 'Code', 'Research', 'Security', 'Content'];

const STATUS_META: Record<string, { label: string; color: string; dot?: boolean; pulse?: boolean }> = {
  open:      { label: 'OPEN',      color: '#c8ff00', dot: true, pulse: true  },
  running:   { label: 'RUNNING',   color: '#ff9900', dot: true, pulse: true  },
  judging:   { label: 'JUDGING',   color: '#aa88ff', dot: true, pulse: true  },
  completed: { label: 'DONE',      color: '#5a5a72', dot: false              },
  cancelled: { label: 'CANCELLED', color: '#ff5f1f', dot: false              },
};

// Groups: active = open/running/judging, completed = done/cancelled
const ACTIVE_STATUSES   = new Set(['open', 'running', 'judging']);
const INACTIVE_STATUSES = new Set(['completed', 'cancelled']);

function timeLeft(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 24 ? `${Math.floor(h / 24)}d` : h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function TaskRow({ task }: { task: Task }) {
  const router = useRouter();
  const agent  = AGENTS.find(a => a.specialty === task.category)!;
  const sm     = STATUS_META[task.status] || { label: task.status.toUpperCase(), color: '#5a5a72' };
  const active = ACTIVE_STATUSES.has(task.status);

  return (
    <div
      className="relative bg-black hover:bg-dim transition-all duration-150 cursor-pointer group flex items-center gap-4 px-5 py-4"
      onClick={() => router.push(`/market/${task.id}`)}
    >
      {/* Left accent bar */}
      <div
        className="w-0.5 h-10 shrink-0 transition-all duration-300"
        style={{ background: active ? agent.color : agent.color + '35' }}
      />

      {/* Agent icon */}
      <div
        className="w-8 h-8 flex items-center justify-center shrink-0 border transition-all"
        style={{
          borderColor: active ? agent.color + '40' : agent.color + '15',
          background:  active ? agent.color + '10' : agent.color + '05',
        }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: active ? agent.color : agent.color + '50' }} />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className={`font-display text-lg truncate transition-colors ${active ? 'text-white group-hover:text-acid' : 'text-white/50 group-hover:text-white/80'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="font-mono text-xs" style={{ color: active ? agent.color : agent.color + '60' }}>
            {task.category.toUpperCase()}
          </span>
          <span className="font-mono text-xs text-muted/40">5 AGENTS</span>
        </div>
      </div>

      {/* Status badge + winner */}
      <div className="hidden sm:flex items-center gap-2 shrink-0">
        {task.status === 'completed' && task.winner_agent_id ? (() => {
          const wa = AGENTS.find(a => a.id === task.winner_agent_id);
          return wa ? (
            <span className="font-mono text-xs flex items-center gap-1.5" style={{ color: wa.color + '90' }}>
              <span>{wa.emoji}</span>
              <span style={{ color: wa.color }}>{wa.fullName}</span>
              <span className="text-muted/40">WON</span>
            </span>
          ) : null;
        })() : (
          <div className="flex items-center gap-1.5">
            {sm.dot && (
              <span
                className={`w-1.5 h-1.5 rounded-full ${sm.pulse ? 'animate-pulse' : ''}`}
                style={{ background: sm.color }}
              />
            )}
            <span className="font-mono text-xs" style={{ color: sm.color }}>{sm.label}</span>
          </div>
        )}
      </div>

      {/* Deadline */}
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        <Clock size={10} className={active ? 'text-muted' : 'text-muted/30'} />
        <span className={`font-mono text-xs ${active ? 'text-muted' : 'text-muted/30'}`}>{timeLeft(task.deadline)}</span>
      </div>

      {/* Reward */}
      <div className="shrink-0 flex items-center gap-1.5">
        <Flame size={11} className={active ? 'text-orange' : 'text-orange/30'} />
        <div className="text-right">
          <div className="font-display text-xl leading-none" style={{ color: active ? agent.color : agent.color + '40' }}>
            {task.reward.toLocaleString('en-US')}
          </div>
          <div className={`font-mono text-xs ${active ? 'text-muted' : 'text-muted/30'}`}>STACK</div>
        </div>
      </div>

      <span className={`font-mono text-xs transition-colors ${active ? 'text-muted group-hover:text-white' : 'text-muted/20 group-hover:text-muted/50'}`}>→</span>
    </div>
  );
}

function SectionHeader({ label, count, icon }: { label: string; count: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-acid/8 bg-dim/40">
      {icon}
      <span className="font-mono text-xs tracking-widest text-acid">{label}</span>
      <span className="font-mono text-xs text-muted/50">({count})</span>
    </div>
  );
}

export default function MarketPage() {
  const router = useRouter();
  const [tasks, setTasks]         = useState<Task[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [catFilter, setCatFilter] = useState<string>('All');   // default: All
  const [statusFilter, setStatus] = useState<string>('All');   // default: All
  const [search, setSearch]       = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '100' });
    if (catFilter !== 'All') params.set('category', catFilter);
    // Don't filter by status server-side when All — we group client-side
    if (statusFilter !== 'All') params.set('status', statusFilter);
    const res  = await fetch(`/api/tasks?${params}`);
    const json = await res.json();
    let data: Task[] = json.data || [];
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(t =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    setTasks(data);
    setLoading(false);
  }, [catFilter, statusFilter, search]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleTaskCreated = (taskId: string) => {
    setShowModal(false);
    router.push(`/market/${taskId}`);
  };

  // Split into groups
  const activeTasks   = tasks.filter(t => ACTIVE_STATUSES.has(t.status));
  const completedTasks = tasks.filter(t => INACTIVE_STATUSES.has(t.status));
  const showGrouped   = statusFilter === 'All';

  return (
    <>
      <Navbar />
      <div className="grid-bg" />
      <div className="pt-14 min-h-screen">

        {/* Header */}
        <div className="border-b border-acid/15 px-5 md:px-14 py-7 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <LiveBadge />
              <span className="font-mono text-xs text-muted">{tasks.length} TASKS</span>
            </div>
            <h1 className="font-display text-6xl md:text-8xl text-white">TASK MARKET</h1>
          </div>
          <Button onClick={() => setShowModal(true)} size="lg">
            <Plus size={16} /> POST TASK
          </Button>
        </div>

        {/* Min rewards strip */}
        <div className="border-b border-acid/10 px-5 md:px-14 py-3 flex gap-6 overflow-x-auto">
          <span className="font-mono text-xs text-muted shrink-0">MIN REWARDS:</span>
          {CATEGORIES.map(cat => {
            const agent = AGENTS.find(a => a.specialty === cat)!;
            return (
              <span key={cat} className="font-mono text-xs shrink-0 flex items-center gap-1.5" style={{ color: agent.color }}>
                {agent.emoji} {cat}: <strong>{MIN_REWARDS[cat]} STACK</strong>
              </span>
            );
          })}
        </div>

        {/* Filters */}
        <div className="border-b border-acid/10 px-5 md:px-14 py-4 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-dim border border-acid/15 text-white font-mono text-xs pl-8 pr-4 py-2 focus:outline-none focus:border-acid/40 placeholder:text-muted"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-1 flex-wrap">
            {['All', ...CATEGORIES].map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`font-mono text-xs px-3 py-1.5 border transition-all ${
                  catFilter === c
                    ? 'border-acid text-acid bg-acid/8'
                    : 'border-acid/15 text-muted hover:border-acid/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex gap-1 flex-wrap">
            {['All', 'open', 'running', 'judging', 'completed'].map(s => {
              const color = STATUS_META[s]?.color;
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`font-mono text-xs px-3 py-1.5 border transition-all ${
                    active
                      ? 'border-acid text-acid bg-acid/8'
                      : 'border-acid/15 text-muted hover:border-acid/40'
                  }`}
                >
                  {s === 'All' ? 'ALL' : (
                    <span className="flex items-center gap-1.5">
                      {ACTIVE_STATUSES.has(s) && (
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} />
                      )}
                      {s.toUpperCase()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task list */}
        <div className="px-5 md:px-14 py-6">
          {loading ? (
            <div className="flex justify-center py-24"><Spinner size={32} /></div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center py-24 gap-4">
              <p className="font-display text-4xl text-muted">NO TASKS YET</p>
              <Button onClick={() => setShowModal(true)}><Plus size={14} /> POST THE FIRST TASK</Button>
            </div>
          ) : showGrouped ? (
            /* ── Grouped view: active first, then completed ─────────────────── */
            <div className="flex flex-col gap-6">
              {/* Active tasks */}
              {activeTasks.length > 0 && (
                <div className="flex flex-col overflow-hidden border border-acid/12">
                  <SectionHeader
                    label="ACTIVE"
                    count={activeTasks.length}
                    icon={<Zap size={12} className="text-acid" />}
                  />
                  <div className="flex flex-col gap-px bg-acid/8">
                    {activeTasks.map(task => <TaskRow key={task.id} task={task} />)}
                  </div>
                </div>
              )}

              {/* Completed tasks */}
              {completedTasks.length > 0 && (
                <div className="flex flex-col overflow-hidden border border-acid/6">
                  <SectionHeader
                    label="COMPLETED"
                    count={completedTasks.length}
                    icon={<CheckCircle2 size={12} className="text-muted/50" />}
                  />
                  <div className="flex flex-col gap-px bg-acid/4">
                    {completedTasks.map(task => <TaskRow key={task.id} task={task} />)}
                  </div>
                </div>
              )}

              {/* Nothing in either group */}
              {activeTasks.length === 0 && completedTasks.length === 0 && (
                <div className="flex flex-col items-center py-24 gap-4">
                  <p className="font-display text-4xl text-muted">NO TASKS FOUND</p>
                </div>
              )}
            </div>
          ) : (
            /* ── Filtered view: flat list ───────────────────────────────────── */
            <div className="flex flex-col gap-px bg-acid/8 border border-acid/12">
              {tasks.map(task => <TaskRow key={task.id} task={task} />)}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PostTaskModal onClose={() => setShowModal(false)} onSuccess={handleTaskCreated} />
      )}
    </>
  );
}

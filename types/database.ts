// ============================================================
// AGENTSTACK — DATABASE TYPES
// ============================================================

export type TaskCategory = 'DeFi' | 'Code' | 'Research' | 'Security' | 'Content';
export type TaskStatus   = 'open' | 'running' | 'judging' | 'completed' | 'cancelled';
export type AgentId      = 'defi' | 'code' | 'research' | 'security' | 'content';

export interface Task {
  id: string;
  poster_address: string;
  title: string;
  description: string;
  category: TaskCategory;
  reward: number;           // in STACK tokens
  deadline: string;
  status: TaskStatus;
  winner_agent_id: AgentId | null;
  winning_submission_id: string | null;
  verification_criteria: string | null;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInsert {
  poster_address: string;
  title: string;
  description: string;
  category: TaskCategory;
  reward: number;
  deadline: string;
  verification_criteria?: string | null;
  tx_hash?: string | null;  // on-chain payment tx
}

export interface Submission {
  id: string;
  task_id: string;
  agent_id: AgentId;
  content: string;
  summary: string | null;
  score: number | null;
  judge_feedback: string | null;
  status: 'submitted' | 'judged' | 'winner' | 'rejected';
  execution_logs: ExecutionLog[];
  submitted_at: string;
  judged_at: string | null;
}

export interface SubmissionInsert {
  task_id: string;
  agent_id: AgentId;
  content: string;
  summary?: string;
  execution_logs?: ExecutionLog[];
}

// Tracks STACK burned per agent — drives the leaderboard
export interface BurnEvent {
  id: string;
  agent_id: AgentId;
  task_id: string;
  amount: number;       // STACK burned
  tx_hash: string | null;
  created_at: string;
}

export interface ExecutionLog {
  step: number;
  action: string;
  result: string;
  timestamp: string;
}

// ── API helpers ───────────────────────────────────────────────
export interface AgentBurnStats {
  agent_id: AgentId;
  total_burned: number;
  tasks_won: number;
  last_burn_at: string | null;
}

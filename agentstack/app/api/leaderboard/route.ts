import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/types/database';

export async function GET() {
  const supabase = createServerClient();

  // Aggregate burns per agent
  const { data: burns, error } = await supabase
    .from('burn_events')
    .select('agent_id, amount, created_at, tx_hash');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const stats: Record<AgentId, { total_burned: number; tasks_won: number; last_burn_at: string | null; last_tx_hash: string | null }> = {
    defi:     { total_burned: 0, tasks_won: 0, last_burn_at: null, last_tx_hash: null },
    code:     { total_burned: 0, tasks_won: 0, last_burn_at: null, last_tx_hash: null },
    research: { total_burned: 0, tasks_won: 0, last_burn_at: null, last_tx_hash: null },
    security: { total_burned: 0, tasks_won: 0, last_burn_at: null, last_tx_hash: null },
    content:  { total_burned: 0, tasks_won: 0, last_burn_at: null, last_tx_hash: null },
  };

  for (const b of burns ?? []) {
    const id = b.agent_id as AgentId;
    if (stats[id]) {
      stats[id].total_burned += Number(b.amount);
      stats[id].tasks_won   += 1;
      if (!stats[id].last_burn_at || b.created_at > stats[id].last_burn_at!) {
        stats[id].last_burn_at  = b.created_at;
        stats[id].last_tx_hash  = b.tx_hash ?? null;
      }
    }
  }

  const leaderboard = AGENTS
    .map(a => ({ ...a, ...stats[a.id] }))
    .sort((a, b) => b.total_burned - a.total_burned);

  const total_burned = Object.values(stats).reduce((s, v) => s + v.total_burned, 0);

  return NextResponse.json({ data: leaderboard, total_burned }, { headers: { 'Cache-Control': 'no-store' } });
}

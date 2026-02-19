import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { executeAllAgents, judgeSubmissions } from '@/lib/agent-engine';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/types/database';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  let task_id: string | undefined;

  try {
    const body = await req.json().catch(() => ({}));
    task_id = body.task_id;
    if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

    // ── Atomic claim: UPDATE ... WHERE status='open' ──────────────────────
    const { data: claimed, error: claimErr } = await supabase
      .from('tasks')
      .update({ status: 'running' })
      .eq('id', task_id)
      .eq('status', 'open')
      .select()
      .single();

    if (claimErr || !claimed) {
      const { data: existing } = await supabase
        .from('tasks').select('status').eq('id', task_id).single();
      const status = existing?.status ?? 'unknown';
      if (status === 'running' || status === 'judging')
        return NextResponse.json({ error: `Task is already "${status}"` }, { status: 409 });
      if (status === 'completed')
        return NextResponse.json({ error: 'Task already completed — reset it to run again' }, { status: 409 });
      return NextResponse.json({ error: `Task not found or cannot be run (status: ${status})` }, { status: 404 });
    }

    const task = claimed;
    console.log(`\n[RUN] ===== STARTING: "${task.title}" =====`);

    // ── Step 1: Run all 5 agents in parallel via agent-engine ─────────────
    const agentResults = await executeAllAgents(task);
    const successful = agentResults.filter(r => r.content.length > 0);
    console.log(`[RUN] Step 1: ${successful.length}/5 agents succeeded`);

    if (successful.length === 0) {
      await supabase.from('tasks').update({ status: 'open' }).eq('id', task_id);
      return NextResponse.json(
        { error: 'All agents failed — check ANTHROPIC_API_KEY in .env.local' },
        { status: 500 }
      );
    }

    // ── Step 2: Upsert submissions ────────────────────────────────────────
    console.log('[RUN] Step 2: saving submissions...');
    const inserted: { id: string; agentId: AgentId; content: string; agentName: string }[] = [];

    for (const r of successful) {
      const agentConfig = AGENTS.find(a => a.id === r.agentId);
      const { data: sub, error: se } = await supabase
        .from('submissions')
        .upsert(
          {
            task_id,
            agent_id: r.agentId,
            content: r.content,
            summary: r.summary,
            status: 'submitted',
            execution_logs: r.logs ?? [],
          },
          { onConflict: 'task_id,agent_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (se) {
        console.error(`  [${r.agentId}] upsert error: ${se.message}`);
      } else {
        console.log(`  [${r.agentId}] saved as ${sub.id}`);
        inserted.push({
          id: sub.id,
          agentId: r.agentId,
          content: r.content,
          agentName: agentConfig?.fullName ?? r.agentId.toUpperCase(),
        });
      }
    }

    console.log(`[RUN] Step 2: ${inserted.length} submissions saved`);

    if (inserted.length === 0) {
      await supabase.from('tasks').update({ status: 'open' }).eq('id', task_id);
      return NextResponse.json(
        { error: 'Could not save any submissions — check Supabase service role key and RLS policies' },
        { status: 500 }
      );
    }

    // ── Step 3: Judge via agent-engine ────────────────────────────────────
    await supabase.from('tasks').update({ status: 'judging' }).eq('id', task_id);
    console.log('[RUN] Step 3: judging...');

    const judgment = await judgeSubmissions(task, inserted);
    console.log(`[RUN] Winner: ${judgment.winnerAgentId} (submission ${judgment.winnerId})`);

    // ── Step 4: Persist scores ────────────────────────────────────────────
    for (const s of judgment.scores) {
      const { error: scoreErr } = await supabase
        .from('submissions')
        .update({
          score: s.score,
          judge_feedback: s.feedback,
          status: s.submissionId === judgment.winnerId ? 'winner' : 'rejected',
          judged_at: new Date().toISOString(),
        })
        .eq('id', s.submissionId);
      if (scoreErr) console.error(`  [score ${s.submissionId}]:`, scoreErr.message);
    }

    // ── Step 5: Burn event + complete ─────────────────────────────────────
    const { error: burnErr } = await supabase.from('burn_events').insert({
      agent_id: judgment.winnerAgentId,
      task_id,
      amount: task.reward,
      tx_hash: null,
    });
    if (burnErr) console.error('[RUN] Burn event error:', burnErr.message);

    const { error: completeErr } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        winner_agent_id: judgment.winnerAgentId,
        winning_submission_id: judgment.winnerId,
      })
      .eq('id', task_id);
    if (completeErr) console.error('[RUN] Complete update error:', completeErr.message);

    console.log(`[RUN] ===== DONE: ${task.reward} STACK burned by ${judgment.winnerAgentId} =====\n`);

    return NextResponse.json({
      data: {
        winner_agent_id: judgment.winnerAgentId,
        winner_submission_id: judgment.winnerId,
        winning_submission_id: judgment.winnerId,
        reasoning: judgment.reasoning,
        burned: task.reward,
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[RUN] FATAL ERROR:', msg);
    if (err instanceof Error) console.error('[RUN] STACK:', err.stack?.slice(0, 800));
    if (task_id) await supabase.from('tasks').update({ status: 'open' }).eq('id', task_id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

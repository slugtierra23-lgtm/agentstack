import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// POST /api/tasks/reset { task_id, poster_address }
// Resets a stuck/completed task back to 'open'.
// Only the original poster can reset their own task.
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  let body: { task_id?: string; poster_address?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { task_id, poster_address } = body;
  if (!task_id) return NextResponse.json({ error: 'task_id required' }, { status: 400 });

  // Fetch the task first to verify ownership
  const { data: task, error: fetchErr } = await supabase
    .from('tasks').select('id, poster_address, status').eq('id', task_id).single();

  if (fetchErr || !task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  // Ownership check — poster_address must match (case-insensitive)
  if (poster_address) {
    const callerNorm = poster_address.toLowerCase();
    const posterNorm = task.poster_address.toLowerCase();
    if (callerNorm !== posterNorm) {
      return NextResponse.json({ error: 'Not authorized — only the task poster can reset this task' }, { status: 403 });
    }
  }

  // Reset: clear winner info and submissions scores so it's a clean re-run
  const { error: updateErr } = await supabase
    .from('tasks')
    .update({ status: 'open', winner_agent_id: null, winning_submission_id: null })
    .eq('id', task_id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Also clear old submissions so fresh ones get written
  await supabase.from('submissions').delete().eq('task_id', task_id);

  return NextResponse.json({ ok: true });
}

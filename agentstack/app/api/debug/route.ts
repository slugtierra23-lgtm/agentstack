import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/debug?task_id=xxx  — returns full task + submissions with all fields
// Useful for diagnosing why output isn't showing
export async function GET(req: NextRequest) {
  const task_id = req.nextUrl.searchParams.get('task_id');
  const supabase = createServerClient();

  if (!task_id) {
    // Return last 5 tasks
    const { data, error } = await supabase
      .from('tasks').select('id, title, status, created_at, updated_at')
      .order('created_at', { ascending: false }).limit(5);
    return NextResponse.json({ recent_tasks: data, error: error?.message });
  }

  const { data: task, error: te } = await supabase
    .from('tasks').select('*').eq('id', task_id).single();

  const { data: subs, error: se } = await supabase
    .from('submissions').select('id, agent_id, status, score, judge_feedback, content, submitted_at, judged_at')
    .eq('task_id', task_id).order('submitted_at');

  return NextResponse.json({
    task: task ?? null,
    task_error: te?.message ?? null,
    submissions: subs ?? [],
    submissions_error: se?.message ?? null,
    submission_count: subs?.length ?? 0,
    has_content: subs?.every(s => s.content?.length > 0) ?? false,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

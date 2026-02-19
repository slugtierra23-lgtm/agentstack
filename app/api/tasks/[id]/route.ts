import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = createServerClient();

  const { data: task, error } = await supabase
    .from('tasks').select('*').eq('id', id).single();
  if (error || !task) return NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const { data: submissions } = await supabase
    .from('submissions').select('*').eq('task_id', id).order('score', { ascending: false, nullsFirst: false });

  return NextResponse.json({ data: { task, submissions: submissions || [] } }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = createServerClient();

  let body: { status?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { status } = body;
  const allowed = ['open', 'cancelled'];
  if (!status || !allowed.includes(status))
    return NextResponse.json({ error: `status must be one of: ${allowed.join(', ')}` }, { status: 400 });

  const { data, error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

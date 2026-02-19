import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { MIN_REWARDS } from '@/lib/agents';
import type { TaskCategory, TaskInsert } from '@/types/database';

export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status');
  const category = searchParams.get('category');
  const poster   = searchParams.get('poster');
  const limit    = parseInt(searchParams.get('limit') || '20');
  const offset   = parseInt(searchParams.get('offset') || '0');

  let q = supabase
    .from('tasks')
    .select('*, submissions(id, agent_id, score, status, summary)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status)   q = q.eq('status', status);
  if (poster)   q = q.eq('poster_address', poster);
  if (category) q = q.eq('category', category);

  const { data, error, count } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, count }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  try {
    const body = await req.json();
    const { poster_address, title, description, category, reward, deadline, verification_criteria, tx_hash } = body;

    if (!poster_address || !title || !description || !category || !deadline)
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });

    const minReward = MIN_REWARDS[category as TaskCategory] ?? 50;
    if ((reward ?? 0) < minReward)
      return NextResponse.json({ error: `Minimum reward for ${category} is ${minReward} STACK` }, { status: 400 });

    if (new Date(deadline) <= new Date())
      return NextResponse.json({ error: 'Deadline must be in the future' }, { status: 400 });

    // tx_hash is required — the payment must have gone on-chain first
    if (!tx_hash)
      return NextResponse.json({ error: 'tx_hash is required — payment must be confirmed on-chain first' }, { status: 400 });

    const insert: TaskInsert = {
      poster_address: poster_address.toLowerCase(),
      title, description, category,
      reward: parseFloat(reward),
      deadline,
      verification_criteria: verification_criteria || null,
      tx_hash: tx_hash as string,
    };

    const { data, error } = await supabase.from('tasks').insert(insert).select().single();
    if (error) {
      if (error.message?.includes('schema cache') || error.message?.includes('does not exist'))
        return NextResponse.json({ error: 'Run supabase/schema.sql in your Supabase SQL Editor first.', setup_required: true }, { status: 503 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

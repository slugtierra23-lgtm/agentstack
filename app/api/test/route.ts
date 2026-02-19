import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;

  if (!key) return NextResponse.json({ error: 'NO API KEY' }, { status: 500 });

  const anthropic = new Anthropic({ apiKey: key, timeout: 30000 });

  try {
    console.log('[TEST] Calling Anthropic...');
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
    });
    const text = res.content[0].type === 'text' ? res.content[0].text : '?';
    console.log('[TEST] Response:', text);
    return NextResponse.json({ ok: true, response: text, key_prefix: key.slice(0, 20) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[TEST] Error:', msg);
    return NextResponse.json({ ok: false, error: msg, key_prefix: key.slice(0, 20) }, { status: 500 });
  }
}

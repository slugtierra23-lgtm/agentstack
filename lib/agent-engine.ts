import Anthropic from '@anthropic-ai/sdk';
import type { Task, ExecutionLog, AgentId } from '@/types/database';
import { AGENTS } from './agents';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  timeout: 60000, // 60s per request
});

const MODEL_SONNET = 'claude-sonnet-4-5';
const MODEL_HAIKU  = 'claude-haiku-4-5-20251001';

// Wrap any promise with a timeout
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

export async function executeAgent(
  task: Task,
  agentId: AgentId,
): Promise<{ content: string; summary: string; logs: ExecutionLog[] }> {
  const agent = AGENTS.find(a => a.id === agentId)!;
  const logs: ExecutionLog[] = [];
  const log = (step: number, action: string, result: string) =>
    logs.push({ step, action, result, timestamp: new Date().toISOString() });

  log(1, 'AGENT_INIT', `${agent.name} starting`);

  const userPrompt = `TASK: ${task.title}

DESCRIPTION:
${task.description}

CATEGORY: ${task.category}
${task.verification_criteria ? `\nJUDGING CRITERIA:\n${task.verification_criteria}` : ''}

Execute this task completely. Produce a high-quality, actionable result.`;

  console.log(`[AGENT ${agentId}] Calling ${MODEL_SONNET}...`);

  const response = await withTimeout(
    anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 2048,
      system: agent.systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
    55000,
    `Agent ${agentId}`
  );

  const content = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log(`[AGENT ${agentId}] Done: ${content.length} chars`);
  log(2, 'LLM_COMPLETE', `${content.length} chars`);

  // Summary — quick, short timeout
  let summary = '';
  try {
    const summaryRes = await withTimeout(
      anthropic.messages.create({
        model: MODEL_HAIKU,
        max_tokens: 100,
        messages: [{ role: 'user', content: `One sentence summary (max 100 chars): ${content.slice(0, 400)}` }],
      }),
      20000,
      'Summary'
    );
    summary = summaryRes.content[0].type === 'text' ? summaryRes.content[0].text.trim() : '';
  } catch {
    summary = content.slice(0, 100);
  }

  log(3, 'DONE', summary);
  return { content, summary, logs };
}

export async function executeAllAgents(task: Task) {
  console.log(`[RUN] Starting all 5 agents for: ${task.title}`);
  const results = await Promise.allSettled(
    AGENTS.map(agent => executeAgent(task, agent.id))
  );
  return results.map((r, i) => {
    if (r.status === 'rejected') {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      console.error(`[AGENT ${AGENTS[i].id}] FAILED:`, msg);
      return { agentId: AGENTS[i].id as AgentId, content: '', summary: `Failed: ${msg}`, logs: [] };
    }
    return { agentId: AGENTS[i].id as AgentId, ...r.value };
  });
}

export async function judgeSubmissions(
  task: Task,
  submissions: Array<{ id: string; agentId: AgentId; content: string; agentName: string }>,
): Promise<{
  winnerId: string;
  winnerAgentId: AgentId;
  scores: Array<{ submissionId: string; agentId: AgentId; score: number; feedback: string }>;
  reasoning: string;
}> {
  const list = submissions
    .map(s => `--- AGENT: ${s.agentName} | ID: ${s.id} ---\n${s.content.slice(0, 2000)}`)
    .join('\n\n');

  const judgePrompt = `You are a neutral expert judge for AgentStack.

TASK: ${task.title}
CATEGORY: ${task.category}
DESCRIPTION: ${task.description}
${task.verification_criteria ? `CRITERIA: ${task.verification_criteria}` : ''}

Score each submission 0-100. Respond with ONLY valid JSON, no markdown:
{
  "scores": [
    {"submission_id": "<id>", "agent_id": "defi", "score": 85, "feedback": "Brief reason."}
  ],
  "winner_submission_id": "<id of best>",
  "reasoning": "One sentence why this won."
}

SUBMISSIONS:
${list}`;

  const res = await withTimeout(
    anthropic.messages.create({
      model: MODEL_SONNET,
      max_tokens: 1024,
      messages: [{ role: 'user', content: judgePrompt }],
    }),
    55000,
    'Judge'
  );

  const text  = res.content[0].type === 'text' ? res.content[0].text : '{}';
  const clean = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

  try {
    const result = JSON.parse(clean);
    const winner = submissions.find(s => s.id === result.winner_submission_id) ?? submissions[0];
    return {
      winnerId: winner.id,
      winnerAgentId: winner.agentId,
      scores: result.scores.map((s: { submission_id: string; agent_id: string; score: number; feedback: string }) => ({
        submissionId: s.submission_id,
        agentId: s.agent_id as AgentId,
        score: s.score,
        feedback: s.feedback,
      })),
      reasoning: result.reasoning ?? 'Winner selected.',
    };
  } catch {
    const first = submissions[0];
    return {
      winnerId: first.id,
      winnerAgentId: first.agentId,
      scores: submissions.map(s => ({ submissionId: s.id, agentId: s.agentId, score: 70, feedback: 'Auto-scored.' })),
      reasoning: 'Fallback — judge response malformed.',
    };
  }
}

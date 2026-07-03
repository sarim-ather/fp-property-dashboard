import Anthropic from '@anthropic-ai/sdk';

export const config = { runtime: 'edge' };

const SYSTEM = `You are a sharp real estate investment analyst embedded in FP Property's dashboard. FP Property is a Dubai-based brokerage running international property roadshows. Your client is Sarim Ather (the principal broker).

Revenue model: commission on property closures (2–2.5% of sale price). Break-even = total event cost ÷ commission rate (in sales volume). Reallocation pool = unallocated corporate buffer + closed-event underspend + returned net profit (capped by surplusCapPercent).

Response style:
- Lead with the recommendation or key finding — no preamble
- Ground every claim in specific AED figures and event names from the live data provided
- 3–5 sentences for most questions; 2 short paragraphs max for complex ones
- No pleasantries, no hedging — be direct and decisive
- If a question is outside the portfolio data, say so briefly and redirect`;

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      'ANTHROPIC_API_KEY not set. Add it to your Vercel environment variables.',
      { status: 500 }
    );
  }

  let message: string;
  let context: string;
  try {
    ({ message, context } = await req.json());
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `${SYSTEM}\n\n${context}`,
    messages: [{ role: 'user', content: message }],
  });

  const readable = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(enc.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

import Anthropic from '@anthropic-ai/sdk';

const SYSTEM = `You are a sharp real estate investment analyst embedded in FP Property's dashboard. FP Property is a Dubai-based brokerage running international property roadshows. Your client is Sarim Ather (the principal broker).

Revenue model: commission on property closures (2–2.5% of sale price). Break-even = total event cost ÷ commission rate (in sales volume). Reallocation pool = unallocated corporate buffer + closed-event underspend + returned net profit (capped by surplusCapPercent).

Response style:
- Lead with the recommendation or key finding — no preamble
- Ground every claim in specific AED figures and event names from the live data provided
- 3–5 sentences for most questions; 2 short paragraphs max for complex ones
- No pleasantries, no hedging — be direct and decisive
- If a question is outside the portfolio data, say so briefly and redirect`;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).send(
      'ANTHROPIC_API_KEY not set. Add it to your Vercel environment variables.'
    );
  }

  const { message, context } = req.body;
  if (!message) return res.status(400).send('Missing message');

  const client = new Anthropic({ apiKey });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `${SYSTEM}\n\n${context}`,
      messages: [{ role: 'user', content: message }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(event.delta.text);
      }
    }
  } catch (err: any) {
    res.write(`\n\nError: ${err.message}`);
  }

  res.end();
}

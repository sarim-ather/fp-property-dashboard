import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { useProfile } from '../../context/ProfileContext';
import { formatPortfolioContext } from '../../utils/formatContext';
import type { ChatMessage, UserProfile } from '../../types';

const PROMPTS: Record<UserProfile | 'finance', string[]> = {
  finance: [
    'Where should I reallocate budget right now?',
    'Which event is at most risk?',
    'What should I do in the next 7 days?',
    'Summarise my portfolio health',
    'Singapore strategy to close the gap',
    'How does Dubai compare to my NY baseline?',
  ],
  sales: [
    'How many units do I need this week to break even?',
    'Which event has the best closing rate?',
    'What is my commission forecast this quarter?',
    'Which leads should I prioritise right now?',
    'How am I tracking vs targets across all events?',
    'What is the pipeline value in reserved and SPA stage?',
  ],
  marketing: [
    'Which event has the best ROAS?',
    'Where should we increase marketing spend?',
    'How is our cost per qualified lead trending?',
    'Which event is generating the most leads?',
    'Summarise marketing performance across all events',
    'How does our conversion rate compare across markets?',
  ],
};

export default function Insights() {
  const { profile } = useProfile();
  const { state } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
    };
    const aiId = crypto.randomUUID();
    const aiMsg: ChatMessage = { id: aiId, role: 'assistant', content: '', streaming: true };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setLoading(true);

    try {
      const context = formatPortfolioContext(state.data);
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), context }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === aiId ? { ...m, content: m.content + chunk } : m)
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const hint = msg.includes('ANTHROPIC_API_KEY')
        ? msg
        : `Error: ${msg}\n\nDeploy to Vercel and set ANTHROPIC_API_KEY as an environment variable, then run via \`vercel dev\` locally.`;
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, content: hint } : m)
      );
    } finally {
      setMessages(prev =>
        prev.map(m => m.id === aiId ? { ...m, streaming: false } : m)
      );
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-navy px-5 py-3.5 flex-shrink-0">
        <div className="text-sm font-bold text-white mb-0.5">AI Portfolio Insights</div>
        <div className="text-xs text-navy-200">
          Powered by Claude · Live data: {state.data.events.length} events ·{' '}
          {state.data.closures.length} closures
        </div>
      </div>

      {/* Preset prompts */}
      <div className="bg-white border-b border-bone px-4 py-2.5 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {(PROMPTS[profile ?? 'finance']).map(p => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={loading}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-bone bg-sand text-ink-500 hover:border-navy hover:text-navy hover:bg-blue-50 transition-colors whitespace-nowrap disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-12">
            <div className="text-2xl">✦</div>
            <div className="text-sm font-semibold text-ink">Ask about your portfolio</div>
            <div className="text-xs text-ink-300 max-w-xs leading-relaxed">
              Claude has live access to all your event P&amp;Ls, budgets, and the reallocation pool. Try a preset above or type your own question.
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'user' ? (
              <div className="bg-navy text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[75%] leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div className="bg-white border border-bone rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                <div className="text-[11px] font-semibold text-brass uppercase tracking-wider mb-1.5">
                  Claude
                </div>
                <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-ink-300 ml-0.5 align-text-bottom animate-pulse rounded-sm" />
                  )}
                  {!msg.streaming && !msg.content && (
                    <span className="text-ink-300 italic">Thinking…</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="flex-shrink-0 bg-white border-t border-bone px-4 py-3 flex gap-2 items-end"
      >
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about your portfolio…"
          rows={1}
          disabled={loading}
          className="flex-1 resize-none border border-bone rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-navy focus:ring-1 focus:ring-navy/20 disabled:opacity-50 leading-relaxed"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex-shrink-0 bg-navy text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-navy-600 transition-colors"
        >
          {loading ? '…' : '→'}
        </button>
      </form>
    </div>
  );
}

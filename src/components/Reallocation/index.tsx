import { useState, type FormEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { computeAvailableToReallocate, computeEventMetrics } from '../../utils/calculations';
import { fmtAED, fmtDate, fmtPct, uid } from '../../utils/format';

const UPCOMING_STAGES = ['Planned', 'Pre-Event', 'Live'];

export default function Reallocation() {
  const { state, dispatch } = useApp();
  const { events, costLineItems, closures, corporatePool, settings, reallocations } = state.data;

  const available = computeAvailableToReallocate(events, costLineItems, closures, corporatePool, settings);
  const upcomingEvents = events.filter(e => UPCOMING_STAGES.includes(e.stage));
  const closedEvents = events.filter(e => e.stage === 'Closed');

  // Rank upcoming events by expected ROI (from baselines or current metrics)
  const ranked = [...upcomingEvents].sort((a, b) => {
    const mA = computeEventMetrics(a, costLineItems, closures);
    const mB = computeEventMetrics(b, costLineItems, closures);
    const roiA = mA.totalCostAED > 0 ? mA.roi : 0;
    const roiB = mB.totalCostAED > 0 ? mB.roi : 0;
    return roiB - roiA;
  });

  const [form, setForm] = useState({
    sourceEventId: '',
    targetEventId: upcomingEvents[0]?.id ?? '',
    amount: '',
    note: '',
  });
  const [error, setError] = useState('');

  function submitReallocation(e: FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setError('Enter a valid amount'); return; }
    if (amount > available + 0.01) { setError(`Only AED ${fmtAED(available, true)} available`); return; }
    if (!form.targetEventId) { setError('Select a target event'); return; }

    const targetEvent = events.find(ev => ev.id === form.targetEventId);
    if (!targetEvent) return;

    dispatch({
      type: 'ADD_REALLOCATION',
      payload: {
        id: uid(),
        date: new Date().toISOString().slice(0, 10),
        sourceEventId: form.sourceEventId || null,
        targetEventId: form.targetEventId,
        amount,
        note: form.note,
      },
    });
    dispatch({
      type: 'UPDATE_EVENT',
      payload: { id: form.targetEventId, changes: { allocatedBudget: targetEvent.allocatedBudget + amount } },
    });
    setForm(p => ({ ...p, amount: '', note: '' }));
    setError('');
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Pool header */}
      <div className="bg-navy text-white rounded-xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4">Budget Pool & Reallocation</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <PoolKPI label="Total Pool" value={fmtAED(corporatePool.totalPool, true)} />
          <PoolKPI label="Total Allocated" value={fmtAED(events.reduce((s, e) => s + e.allocatedBudget, 0), true)} />
          <PoolKPI label="Available to Reallocate" value={fmtAED(available, true)} highlight />
          <div className="rounded-lg bg-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wider opacity-75 mb-1">Closed Events Recoverable</div>
            <div className="text-base font-bold text-white">
              {fmtAED(
                closedEvents.reduce((s, e) => {
                  const m = computeEventMetrics(e, costLineItems, closures);
                  return s + Math.max(0, e.allocatedBudget - m.totalCostAED) + Math.max(0, m.netPnL) * settings.surplusCapPercent;
                }, 0),
                true
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranked events */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-bone shadow-sm">
          <div className="px-5 py-3.5 border-b border-bone font-semibold text-sm text-ink">
            Upcoming Events — ranked by current ROI
          </div>
          {ranked.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-ink-300">No upcoming events</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-300">
                  <th className="px-5 py-2.5 text-left font-medium">Event</th>
                  <th className="px-2 py-2.5 text-left font-medium">Stage</th>
                  <th className="px-2 py-2.5 text-right font-medium">Allocated</th>
                  <th className="px-2 py-2.5 text-right font-medium">Spent</th>
                  <th className="px-2 py-2.5 text-right font-medium">Variance</th>
                  <th className="px-2 py-2.5 text-right font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((event, idx) => {
                  const m = computeEventMetrics(event, costLineItems, closures);
                  return (
                    <tr key={event.id} className="border-t border-bone/50 hover:bg-sand/50">
                      <td className="px-5 py-2.5">
                        <div className="font-medium text-ink">{event.name}</div>
                        <div className="text-ink-300 text-[10px]">{event.city}</div>
                      </td>
                      <td className="px-2 py-2.5 text-ink-500">{event.stage}</td>
                      <td className="px-2 py-2.5 text-right">{fmtAED(event.allocatedBudget, true)}</td>
                      <td className="px-2 py-2.5 text-right">{fmtAED(m.totalCostAED, true)}</td>
                      <td className={`px-2 py-2.5 text-right ${m.budgetVariance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {m.budgetVariance >= 0 ? '+' : ''}{fmtAED(m.budgetVariance, true)}
                      </td>
                      <td className={`px-2 py-2.5 text-right font-medium ${m.roi >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {m.totalCostAED > 0 ? fmtPct(m.roi) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Reallocation form */}
        <div className="bg-white rounded-xl border border-bone shadow-sm p-5">
          <div className="font-semibold text-sm text-ink mb-4">Move Budget</div>
          <form onSubmit={submitReallocation} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">From (source)</label>
              <select
                className="w-full border border-bone rounded px-3 py-1.5 text-sm text-ink"
                value={form.sourceEventId}
                onChange={e => setForm(p => ({ ...p, sourceEventId: e.target.value }))}
              >
                <option value="">Pool (unallocated + recoverable)</option>
                {closedEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">To (target event)</label>
              <select
                className="w-full border border-bone rounded px-3 py-1.5 text-sm text-ink"
                value={form.targetEventId}
                onChange={e => setForm(p => ({ ...p, targetEventId: e.target.value }))}
              >
                <option value="">Select event...</option>
                {upcomingEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Amount (AED)</label>
              <input
                type="number" min="1" step="1000"
                className="w-full border border-bone rounded px-3 py-1.5 text-sm text-ink"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder={`Max: ${fmtAED(available, true)}`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1">Note</label>
              <input
                className="w-full border border-bone rounded px-3 py-1.5 text-sm text-ink"
                value={form.note}
                onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                placeholder="Reason for reallocation"
              />
            </div>
            {error && <div className="text-xs text-red-700 bg-red-50 rounded px-3 py-2">{error}</div>}
            <button type="submit" className="w-full bg-navy text-white text-sm py-2 rounded hover:bg-navy-600 transition-colors">
              Reallocate Budget
            </button>
          </form>
        </div>
      </div>

      {/* Reallocation log */}
      <div className="bg-white rounded-xl border border-bone shadow-sm">
        <div className="px-5 py-3.5 border-b border-bone font-semibold text-sm text-ink">Reallocation Log</div>
        {reallocations.length === 0 ? (
          <div className="px-5 py-6 text-center text-xs text-ink-300">No reallocations yet</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-ink-300">
                <th className="px-5 py-2.5 text-left font-medium">Date</th>
                <th className="px-2 py-2.5 text-left font-medium">From</th>
                <th className="px-2 py-2.5 text-left font-medium">To</th>
                <th className="px-2 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 text-left font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {[...reallocations].reverse().map(r => {
                const src = r.sourceEventId ? events.find(e => e.id === r.sourceEventId)?.name ?? '—' : 'Pool';
                const tgt = events.find(e => e.id === r.targetEventId)?.name ?? '—';
                return (
                  <tr key={r.id} className="border-t border-bone/50">
                    <td className="px-5 py-2.5 text-ink-300">{fmtDate(r.date)}</td>
                    <td className="px-2 py-2.5 text-ink">{src}</td>
                    <td className="px-2 py-2.5 text-ink">{tgt}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-emerald-700">{fmtAED(r.amount)}</td>
                    <td className="px-4 py-2.5 text-ink-300">{r.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PoolKPI({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${highlight ? 'bg-brass text-ink' : 'bg-white/10'}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-75 mb-0.5">{label}</div>
      <div className={`text-base font-bold ${highlight ? 'text-ink' : 'text-white'}`}>{value}</div>
    </div>
  );
}

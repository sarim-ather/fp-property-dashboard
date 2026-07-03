import { useApp } from '../../context/AppContext';
import { computeMarketBaselines, computeEventMetrics } from '../../utils/calculations';
import { fmtAED, fmtPct, fmtNumber } from '../../utils/format';

export default function Baselines() {
  const { state } = useApp();
  const { events, costLineItems, closures } = state.data;
  const baselines = computeMarketBaselines(events, costLineItems, closures);

  const liveEvents = events.filter(e => e.stage === 'Live' || e.stage === 'Post-Event');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-navy text-white rounded-xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-1">Market Baselines</h2>
        <p className="text-navy-200 text-xs">Benchmarks derived from all Closed events, used to set expectations for new roadshows.</p>
      </div>

      {baselines.length === 0 ? (
        <div className="bg-white rounded-xl border border-bone p-8 text-center text-sm text-ink-300">
          No closed events yet — baselines will appear once events are marked Closed.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-bone shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-bone">
            <div className="font-semibold text-sm text-ink">Per-Market Performance Benchmarks</div>
            <div className="text-xs text-ink-300 mt-0.5">Based on {baselines.reduce((s, b) => s + b.eventCount, 0)} closed event(s)</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-sand text-ink-300">
                  <th className="px-5 py-3 text-left font-semibold">Market</th>
                  <th className="px-3 py-3 text-center font-semibold">Events</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg Cost</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg Commission</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg ROI</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg CPQL</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg Cost/Closure</th>
                  <th className="px-3 py-3 text-right font-semibold">Avg Closures</th>
                </tr>
              </thead>
              <tbody>
                {baselines.map(b => (
                  <tr key={b.market} className="border-t border-bone/50 hover:bg-sand/30">
                    <td className="px-5 py-3 font-semibold text-ink">{b.market}</td>
                    <td className="px-3 py-3 text-center text-ink-500">{b.eventCount}</td>
                    <td className="px-3 py-3 text-right">{fmtAED(b.avgCost, true)}</td>
                    <td className="px-3 py-3 text-right font-medium text-emerald-700">{fmtAED(b.avgCommission, true)}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${b.avgROI >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {fmtPct(b.avgROI)}
                    </td>
                    <td className="px-3 py-3 text-right">{b.avgCPQL > 0 ? fmtAED(b.avgCPQL, true) : '—'}</td>
                    <td className="px-3 py-3 text-right">{b.avgCostPerClosure > 0 ? fmtAED(b.avgCostPerClosure, true) : '—'}</td>
                    <td className="px-3 py-3 text-right">{fmtNumber(b.avgClosureCount, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live events flagged below baseline */}
      {liveEvents.length > 0 && baselines.length > 0 && (
        <div className="bg-white rounded-xl border border-bone shadow-sm">
          <div className="px-5 py-3.5 border-b border-bone font-semibold text-sm text-ink">
            Live & Post-Event — vs Market Baseline
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-sand text-ink-300">
                <th className="px-5 py-3 text-left font-semibold">Event</th>
                <th className="px-3 py-3 text-left font-semibold">Market</th>
                <th className="px-3 py-3 text-right font-semibold">Current ROI</th>
                <th className="px-3 py-3 text-right font-semibold">Baseline ROI</th>
                <th className="px-3 py-3 text-right font-semibold">vs Baseline</th>
                <th className="px-3 py-3 text-right font-semibold">Current CPQL</th>
                <th className="px-3 py-3 text-right font-semibold">Baseline CPQL</th>
              </tr>
            </thead>
            <tbody>
              {liveEvents.map(event => {
                const m = computeEventMetrics(event, costLineItems, closures);
                const baseline = baselines.find(b => b.market === event.market);
                const roiDiff = baseline ? m.roi - baseline.avgROI : null;
                const belowBaseline = roiDiff !== null && roiDiff < -0.05;
                return (
                  <tr key={event.id} className={`border-t border-bone/50 ${belowBaseline ? 'bg-red-50' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="font-medium text-ink">{event.name}</div>
                      {belowBaseline && <div className="text-[10px] text-red-600 mt-0.5">⚠ Below baseline ROI</div>}
                    </td>
                    <td className="px-3 py-3 text-ink-500">{event.market}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${m.roi >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {m.totalCostAED > 0 ? fmtPct(m.roi) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right text-ink-300">
                      {baseline ? fmtPct(baseline.avgROI) : '—'}
                    </td>
                    <td className={`px-3 py-3 text-right font-medium ${roiDiff === null ? '' : roiDiff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {roiDiff === null ? '—' : `${roiDiff >= 0 ? '+' : ''}${fmtPct(roiDiff)}`}
                    </td>
                    <td className="px-3 py-3 text-right">{m.cpql > 0 ? fmtAED(m.cpql, true) : '—'}</td>
                    <td className="px-3 py-3 text-right text-ink-300">
                      {baseline?.avgCPQL ? fmtAED(baseline.avgCPQL, true) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {baselines.length > 0 && (
        <div className="bg-brass-pale border border-brass/20 rounded-xl p-4 text-xs text-ink-500">
          <strong className="text-brass-dark">How baselines work:</strong> When you create a new event in a market with a baseline, default budget and commission assumptions are pre-filled from historical averages. Live events tracking below their market's baseline ROI by more than 5% are flagged in red above.
        </div>
      )}
    </div>
  );
}

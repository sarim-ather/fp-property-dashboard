import { useApp } from '../../context/AppContext';
import { computeEventMetrics } from '../../utils/calculations';

function aed(n: number) {
  return `AED ${Math.round(n).toLocaleString()}`;
}

const STATUS_COLOR: Record<string, string> = {
  Planned:    'bg-ink-100 text-ink-400',
  'Pre-Event':'bg-blue-50 text-blue-600',
  Live:       'bg-emerald-50 text-emerald-700',
  'Post-Event':'bg-amber-50 text-amber-700',
  Closed:     'bg-bone text-ink-300',
};

export default function SalesDashboard() {
  const { state } = useApp();
  const { events, costLineItems, closures } = state.data;

  const activeEvents = events.filter(e => e.stage !== 'Closed');
  const allMetrics = events.map(e => computeEventMetrics(e, costLineItems, closures));

  const totalCommission = allMetrics.reduce((s, m) => s + m.totalCommissionAED, 0);
  const totalClosures   = allMetrics.reduce((s, m) => s + m.closureCount, 0);
  const pipelineValue   = closures
    .filter(c => c.status === 'Reserved' || c.status === 'SPA Signed')
    .reduce((s, c) => s + c.commissionEarned, 0);

  return (
    <div className="h-full overflow-y-auto bg-sand">
      {/* Header */}
      <div className="bg-emerald-600 px-5 py-4">
        <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-0.5">Sales View</div>
        <div className="text-white font-bold text-lg">{aed(totalCommission)}</div>
        <div className="text-emerald-100 text-xs">Total commission earned · {totalClosures} closure{totalClosures !== 1 ? 's' : ''}</div>
      </div>

      {/* Summary strip */}
      <div className="bg-white border-b border-bone px-4 py-3 flex gap-4">
        <Stat label="Pipeline" value={aed(pipelineValue)} sub="reserved + SPA" />
        <div className="w-px bg-bone" />
        <Stat label="Active events" value={String(activeEvents.length)} sub="live now" />
        <div className="w-px bg-bone" />
        <Stat label="Closed units" value={String(totalClosures)} sub="all time" />
      </div>

      {/* Per-event cards */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {events.map(event => {
          const m = computeEventMetrics(event, costLineItems, closures);
          const eventClosures = closures.filter(c => c.eventId === event.id);
          const progress = Math.min(m.progressToBreakEven, 1);

          return (
            <div key={event.id} className="bg-white rounded-xl border border-bone p-4 shadow-sm">
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-sm text-ink">{event.name}</div>
                  <div className="text-xs text-ink-300">{event.city}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[event.stage] ?? 'bg-bone text-ink-300'}`}>
                  {event.stage}
                </span>
              </div>

              {/* Break-even progress */}
              <div className="mb-3">
                <div className="flex justify-between text-[11px] text-ink-300 mb-1">
                  <span>Break-even progress</span>
                  <span className={progress >= 1 ? 'text-emerald-600 font-semibold' : ''}>
                    {(progress * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-bone rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progress >= 1 ? 'bg-emerald-500' : 'bg-navy'}`}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                {m.unitsStillNeeded > 0 && event.stage !== 'Closed' && (
                  <div className="text-[11px] text-amber-600 mt-1">
                    {m.unitsStillNeeded} unit{m.unitsStillNeeded !== 1 ? 's' : ''} still needed to break even
                  </div>
                )}
              </div>

              {/* Commission & closures */}
              <div className="flex gap-3 text-xs">
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Commission</div>
                  <div className="font-semibold text-ink">{aed(m.totalCommissionAED)}</div>
                </div>
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Closures</div>
                  <div className="font-semibold text-ink">{eventClosures.length}</div>
                </div>
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Avg unit</div>
                  <div className="font-semibold text-ink">{aed(event.avgUnitPrice)}</div>
                </div>
              </div>

              {/* Closure list */}
              {eventClosures.length > 0 && (
                <div className="mt-3 border-t border-bone pt-3 flex flex-col gap-1.5">
                  {eventClosures.map(c => (
                    <div key={c.id} className="flex justify-between items-center text-xs">
                      <span className="text-ink-400">{c.clientRef}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-ink font-medium">{aed(c.commissionEarned)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          c.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                          c.status === 'SPA Signed' ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] text-ink-300 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-bold text-ink truncate">{value}</div>
      <div className="text-[10px] text-ink-300">{sub}</div>
    </div>
  );
}

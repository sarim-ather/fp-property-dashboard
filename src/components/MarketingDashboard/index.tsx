import { useApp } from '../../context/AppContext';
import { computeEventMetrics } from '../../utils/calculations';

function aed(n: number) {
  return `AED ${Math.round(n).toLocaleString()}`;
}

const STATUS_COLOR: Record<string, string> = {
  Planned:    'bg-ink-100 text-ink-400',
  'Pre-Event':'bg-blue-50 text-blue-600',
  Live:       'bg-brass text-ink',
  'Post-Event':'bg-amber-50 text-amber-700',
  Closed:     'bg-bone text-ink-300',
};

export default function MarketingDashboard() {
  const { state } = useApp();
  const { events, costLineItems, closures } = state.data;

  const allMetrics = events.map(e => computeEventMetrics(e, costLineItems, closures));
  const totalMarketingSpend = allMetrics.reduce((s, m) => s + m.marketingSpend, 0);
  const totalLeads = events.reduce((s, e) => s + e.qualifiedLeads, 0);
  const blendedROAS = totalMarketingSpend > 0
    ? allMetrics.reduce((s, m) => s + m.totalCommissionAED, 0) / totalMarketingSpend
    : 0;

  return (
    <div className="h-full overflow-y-auto bg-sand">
      {/* Header */}
      <div className="bg-brass px-5 py-4">
        <div className="text-xs font-bold text-ink/60 uppercase tracking-widest mb-0.5">Marketing View</div>
        <div className="text-ink font-bold text-lg">{blendedROAS.toFixed(2)}x</div>
        <div className="text-ink/70 text-xs">Blended ROAS · {totalLeads} qualified leads total</div>
      </div>

      {/* Summary strip */}
      <div className="bg-white border-b border-bone px-4 py-3 flex gap-4">
        <Stat label="Mktg spend" value={aed(totalMarketingSpend)} sub="all events" />
        <div className="w-px bg-bone" />
        <Stat label="Total leads" value={String(totalLeads)} sub="qualified" />
        <div className="w-px bg-bone" />
        <Stat label="Blended ROAS" value={`${blendedROAS.toFixed(2)}x`} sub="commission/spend" />
      </div>

      {/* Per-event cards */}
      <div className="px-4 py-4 flex flex-col gap-3">
        {events.map((event, i) => {
          const m = allMetrics[i];
          const roasColor = m.roas >= 3 ? 'text-emerald-600' : m.roas >= 1 ? 'text-navy' : 'text-red-500';

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

              {/* Key metrics */}
              <div className="flex gap-3 text-xs mb-3">
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">ROAS</div>
                  <div className={`font-bold ${roasColor}`}>{m.roas.toFixed(2)}x</div>
                </div>
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Mktg spend</div>
                  <div className="font-semibold text-ink">{aed(m.marketingSpend)}</div>
                </div>
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Leads</div>
                  <div className="font-semibold text-ink">{event.qualifiedLeads}</div>
                </div>
              </div>

              {/* CPQL & ROAS bar */}
              <div className="flex gap-3 text-xs">
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Cost per lead</div>
                  <div className="font-semibold text-ink">
                    {event.qualifiedLeads > 0 ? aed(m.cpql) : '—'}
                  </div>
                </div>
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Closures</div>
                  <div className="font-semibold text-ink">{m.closureCount}</div>
                </div>
                <div className="flex-1 bg-sand rounded-lg px-3 py-2">
                  <div className="text-ink-300 mb-0.5">Conv. rate</div>
                  <div className="font-semibold text-ink">
                    {event.qualifiedLeads > 0
                      ? `${((m.closureCount / event.qualifiedLeads) * 100).toFixed(0)}%`
                      : '—'}
                  </div>
                </div>
              </div>

              {/* ROAS visual bar */}
              {m.marketingSpend > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-ink-300 mb-1">
                    <span>Commission vs spend</span>
                    <span className={roasColor + ' font-semibold'}>{m.roas.toFixed(2)}x return</span>
                  </div>
                  <div className="h-1.5 bg-bone rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.roas >= 1 ? 'bg-brass' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(m.roas / 5, 1) * 100}%` }}
                    />
                  </div>
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

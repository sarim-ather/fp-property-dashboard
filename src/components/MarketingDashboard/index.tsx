import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { computeEventMetrics } from '../../utils/calculations';

function aed(n: number) { return `AED ${Math.round(n).toLocaleString()}`; }

const STATUS_COLOR: Record<string, string> = {
  Planned:     'bg-slate-100 text-slate-600',
  'Pre-Event': 'bg-blue-50 text-blue-600',
  Live:        'bg-brass text-ink',
  'Post-Event':'bg-amber-50 text-amber-700',
  Closed:      'bg-bone text-ink-300',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const card      = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 270 } } };

export default function MarketingDashboard() {
  const { state } = useApp();
  const { events, costLineItems, closures } = state.data;

  const allMetrics         = events.map(e => computeEventMetrics(e, costLineItems, closures));
  const totalMarketingSpend = allMetrics.reduce((s, m) => s + m.marketingSpend, 0);
  const totalLeads         = events.reduce((s, e) => s + e.qualifiedLeads, 0);
  const blendedROAS        = totalMarketingSpend > 0
    ? allMetrics.reduce((s, m) => s + m.totalCommissionAED, 0) / totalMarketingSpend : 0;

  return (
    <div className="h-full overflow-y-auto bg-sand">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
        className="bg-brass px-5 py-4">
        <div className="text-xs font-bold text-ink/60 uppercase tracking-widest mb-0.5">Marketing View</div>
        <div className="text-ink font-bold text-lg">{blendedROAS.toFixed(2)}x</div>
        <div className="text-ink/70 text-xs">Blended ROAS · {totalLeads} qualified leads</div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="bg-white border-b border-bone px-4 py-3 flex gap-4">
        <Stat label="Mktg spend"   value={aed(totalMarketingSpend)} sub="all events" />
        <div className="w-px bg-bone" />
        <Stat label="Total leads"  value={String(totalLeads)}       sub="qualified" />
        <div className="w-px bg-bone" />
        <Stat label="Blended ROAS" value={`${blendedROAS.toFixed(2)}x`} sub="commission/spend" />
      </motion.div>

      <motion.div className="px-4 py-4 flex flex-col gap-3" variants={container} initial="hidden" animate="show">
        {events.map((event, idx) => {
          const m = allMetrics[idx];
          const roasColor = m.roas >= 3 ? 'text-emerald-600' : m.roas >= 1 ? 'text-navy' : 'text-red-500';

          return (
            <motion.div key={event.id} variants={card}
              whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.08)' }}
              className="bg-white rounded-xl border border-bone p-4 shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-sm text-ink">{event.name}</div>
                  <div className="text-xs text-ink-300">{event.city}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[event.stage] ?? 'bg-bone text-ink-300'}`}>{event.stage}</span>
              </div>

              <div className="flex gap-3 text-xs mb-3">
                {[
                  { label: 'ROAS',       value: <span className={`font-bold ${roasColor}`}>{m.roas.toFixed(2)}x</span> },
                  { label: 'Mktg spend', value: <span className="font-semibold text-ink">{aed(m.marketingSpend)}</span> },
                  { label: 'Leads',      value: <span className="font-semibold text-ink">{event.qualifiedLeads}</span> },
                ].map(s => (
                  <div key={s.label} className="flex-1 bg-sand rounded-lg px-3 py-2">
                    <div className="text-ink-300 mb-0.5">{s.label}</div>
                    {s.value}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 text-xs">
                {[
                  { label: 'Cost/lead',  value: event.qualifiedLeads > 0 ? aed(m.cpql) : '—' },
                  { label: 'Closures',   value: String(m.closureCount) },
                  { label: 'Conv. rate', value: event.qualifiedLeads > 0 ? `${((m.closureCount / event.qualifiedLeads) * 100).toFixed(0)}%` : '—' },
                ].map(s => (
                  <div key={s.label} className="flex-1 bg-sand rounded-lg px-3 py-2">
                    <div className="text-ink-300 mb-0.5">{s.label}</div>
                    <div className="font-semibold text-ink">{s.value}</div>
                  </div>
                ))}
              </div>

              {m.marketingSpend > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-ink-300 mb-1">
                    <span>Commission vs spend</span>
                    <span className={`${roasColor} font-semibold`}>{m.roas.toFixed(2)}x return</span>
                  </div>
                  <div className="h-1.5 bg-bone rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${m.roas >= 1 ? 'bg-brass' : 'bg-red-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(m.roas / 5, 1) * 100}%` }}
                      transition={{ duration: 0.9, ease: [0.22,1,0.36,1], delay: 0.2 }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
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

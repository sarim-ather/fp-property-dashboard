import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import { computeEventMetrics } from '../../utils/calculations';

function aed(n: number) { return `AED ${Math.round(n).toLocaleString()}`; }

const STATUS_COLOR: Record<string, string> = {
  Planned:     'bg-slate-100 text-slate-600',
  'Pre-Event': 'bg-blue-50 text-blue-600',
  Live:        'bg-emerald-50 text-emerald-700',
  'Post-Event':'bg-amber-50 text-amber-700',
  Closed:      'bg-bone text-ink-300',
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const card      = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 22, stiffness: 270 } } };

export default function SalesDashboard() {
  const { state } = useApp();
  const { events, costLineItems, closures } = state.data;

  const allMetrics    = events.map(e => computeEventMetrics(e, costLineItems, closures));
  const totalComm     = allMetrics.reduce((s, m) => s + m.totalCommissionAED, 0);
  const totalClosures = allMetrics.reduce((s, m) => s + m.closureCount, 0);
  const pipeline      = closures.filter(c => c.status === 'Reserved' || c.status === 'SPA Signed').reduce((s, c) => s + c.commissionEarned, 0);
  const active        = events.filter(e => e.stage !== 'Closed').length;

  return (
    <div className="h-full overflow-y-auto bg-sand">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22,1,0.36,1] }}
        className="bg-emerald-600 px-5 py-4">
        <div className="text-xs font-bold text-emerald-100 uppercase tracking-widest mb-0.5">Sales View</div>
        <div className="text-white font-bold text-lg">{aed(totalComm)}</div>
        <div className="text-emerald-100 text-xs">Total commission · {totalClosures} closure{totalClosures !== 1 ? 's' : ''}</div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
        className="bg-white border-b border-bone px-4 py-3 flex gap-4">
        <Stat label="Pipeline"      value={aed(pipeline)}    sub="reserved + SPA" />
        <div className="w-px bg-bone" />
        <Stat label="Active events" value={String(active)}   sub="in progress" />
        <div className="w-px bg-bone" />
        <Stat label="Closed units"  value={String(totalClosures)} sub="all time" />
      </motion.div>

      <motion.div className="px-4 py-4 flex flex-col gap-3" variants={container} initial="hidden" animate="show">
        {events.map(event => {
          const m = computeEventMetrics(event, costLineItems, closures);
          const eventClosures = closures.filter(c => c.eventId === event.id);
          const progress = Math.min(m.progressToBreakEven, 1);

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

              <div className="mb-3">
                <div className="flex justify-between text-[11px] text-ink-300 mb-1">
                  <span>Break-even progress</span>
                  <span className={progress >= 1 ? 'text-emerald-600 font-semibold' : ''}>{(progress * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-bone rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${progress >= 1 ? 'bg-emerald-500' : 'bg-navy'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.9, ease: [0.22,1,0.36,1], delay: 0.2 }}
                  />
                </div>
                {m.unitsStillNeeded > 0 && event.stage !== 'Closed' && (
                  <div className="text-[11px] text-amber-600 mt-1">{m.unitsStillNeeded} unit{m.unitsStillNeeded !== 1 ? 's' : ''} still needed</div>
                )}
              </div>

              <div className="flex gap-3 text-xs">
                {[
                  { label: 'Commission', value: aed(m.totalCommissionAED) },
                  { label: 'Closures',   value: String(eventClosures.length) },
                  { label: 'Avg unit',   value: aed(event.avgUnitPrice) },
                ].map(s => (
                  <div key={s.label} className="flex-1 bg-sand rounded-lg px-3 py-2">
                    <div className="text-ink-300 mb-0.5">{s.label}</div>
                    <div className="font-semibold text-ink">{s.value}</div>
                  </div>
                ))}
              </div>

              {eventClosures.length > 0 && (
                <div className="mt-3 border-t border-bone pt-3 flex flex-col gap-1.5">
                  {eventClosures.map(c => (
                    <div key={c.id} className="flex justify-between items-center text-xs">
                      <span className="text-ink-400">{c.clientRef}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-ink font-medium">{aed(c.commissionEarned)}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          c.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' :
                          c.status === 'SPA Signed' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>{c.status}</span>
                      </div>
                    </div>
                  ))}
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

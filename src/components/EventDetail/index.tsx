import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { computeEventMetrics } from '../../utils/calculations';
import { fmtAED, fmtCurrency, fmtDate, fmtPct, signClass, signPrefix, uid } from '../../utils/format';
import type { CostCategory, CostLineItem, CostPhase, Closure, ClosureStatus, Event } from '../../types';
import Modal from '../shared/Modal';

const PHASES: CostPhase[] = ['Pre-Event', 'Live', 'Post-Event'];
const CATEGORIES: CostCategory[] = [
  'Venue', 'Flights', 'Accommodation', 'Visa', 'Marketing/Meta Ads',
  'Collateral/Print', 'Staff', 'Hospitality', 'Transport', 'Sponsorship', 'CRM/Follow-up', 'Other',
];
const CLOSURE_STATUSES: ClosureStatus[] = ['Reserved', 'SPA Signed', 'Paid'];
const STATUS_COLORS: Record<ClosureStatus, string> = {
  Reserved: 'bg-slate-100 text-slate-700',
  'SPA Signed': 'bg-blue-100 text-blue-800',
  Paid: 'bg-emerald-100 text-emerald-800',
};

export default function EventDetail() {
  const { state, dispatch } = useApp();
  const eventId = state.ui.selectedEventId!;
  const event = state.data.events.find(e => e.id === eventId)!;
  const { costLineItems, closures } = state.data;

  const [costModal, setCostModal] = useState<Partial<CostLineItem> | null>(null);
  const [closureModal, setClosureModal] = useState<Partial<Closure> | null>(null);
  const [leadsEditing, setLeadsEditing] = useState(false);
  const [leadsVal, setLeadsVal] = useState(String(event.qualifiedLeads));

  const metrics = computeEventMetrics(event, costLineItems, closures);
  const eventItems = costLineItems.filter(i => i.eventId === eventId);
  const eventClosures = closures.filter(c => c.eventId === eventId);

  const pct = Math.min(metrics.progressToBreakEven, 1);
  const targetPct = Math.min(metrics.totalCommissionAED / (metrics.totalCostAED * (1 + event.targetProfitMargin)), 1);

  function saveCost(f: Partial<CostLineItem> & { amount: string }) {
    const item: CostLineItem = {
      id: f.id ?? uid(),
      eventId,
      phase: (f.phase ?? 'Pre-Event') as CostPhase,
      category: (f.category ?? 'Other') as CostCategory,
      description: f.description ?? '',
      amount: parseFloat(f.amount) || 0,
      isActual: f.isActual ?? false,
      date: f.date ?? new Date().toISOString().slice(0, 10),
    };
    if (f.id) {
      dispatch({ type: 'UPDATE_COST_ITEM', payload: { id: f.id, changes: item } });
    } else {
      dispatch({ type: 'ADD_COST_ITEM', payload: item });
    }
    setCostModal(null);
  }

  function saveClosure(f: Partial<Closure> & { propertyValue: string; commissionRateOverride: string }) {
    const rate = f.commissionRateOverride ? parseFloat(f.commissionRateOverride) / 100 : event.commissionRate;
    const pv = parseFloat(f.propertyValue) || 0;
    const cl: Closure = {
      id: f.id ?? uid(),
      eventId,
      clientRef: f.clientRef ?? '',
      propertyValue: pv,
      commissionRateOverride: f.commissionRateOverride ? parseFloat(f.commissionRateOverride) / 100 : undefined,
      commissionEarned: pv * rate,
      status: (f.status ?? 'Reserved') as ClosureStatus,
      closeDate: f.closeDate ?? new Date().toISOString().slice(0, 10),
    };
    if (f.id) {
      dispatch({ type: 'UPDATE_CLOSURE', payload: { id: f.id, changes: cl } });
    } else {
      dispatch({ type: 'ADD_CLOSURE', payload: cl });
    }
    setClosureModal(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-navy text-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => dispatch({ type: 'SELECT_EVENT', payload: null })}
            className="text-navy-200 hover:text-white text-sm transition-colors"
          >
            ← Portfolio
          </button>
          <span className="text-navy-200">/</span>
          <span className="text-sm">{event.name}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{event.name}</h1>
            <p className="text-navy-200 text-sm mt-0.5">
              {event.city}, {event.market} · {event.startDate} – {event.endDate} · {event.currency} (×{event.fxRateToAED})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StageSelect event={event} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-sand">
        <div className="max-w-6xl mx-auto px-4 py-5 space-y-5">

          {/* Break-Even Panel */}
          <div className="bg-white rounded-xl border border-bone shadow-sm p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-300 mb-4">Break-Even Engine</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <BEMetric label="Total Cost" value={fmtAED(metrics.totalCostAED)} sub="AED" />
              <BEMetric label="Commission Earned" value={fmtAED(metrics.totalCommissionAED)} sub="AED" pos={metrics.totalCommissionAED > 0} />
              <BEMetric label="Net P&L" value={`${signPrefix(metrics.netPnL)}${fmtAED(metrics.netPnL)}`} sub="AED" colored={metrics.netPnL} />
              <BEMetric label="ROI" value={fmtPct(metrics.roi)} sub="on cost" colored={metrics.roi} />
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-ink-300 mb-1.5">
                <span>Progress to Break-even</span>
                <span>{fmtPct(pct)} · {fmtAED(metrics.totalCommissionAED, true)} / {fmtAED(metrics.totalCostAED, true)}</span>
              </div>
              <div className="h-3 bg-bone rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 1 ? 'bg-emerald-500' : 'bg-navy'}`}
                  style={{ width: `${pct * 100}%` }}
                />
                {/* Target marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-brass"
                  style={{ left: `${Math.min(targetPct * 100, 100)}%` }}
                  title="Target profit margin"
                />
              </div>
            </div>

            {/* What you need */}
            <div className="grid grid-cols-2 gap-3">
              <NeedCard
                label="To break even"
                commNeeded={metrics.commissionsStillNeeded}
                units={metrics.unitsStillNeeded}
                done={metrics.commissionsStillNeeded === 0}
              />
              <NeedCard
                label={`To hit ${fmtPct(event.targetProfitMargin)} target`}
                commNeeded={metrics.commissionsToTarget}
                units={metrics.unitsToTarget}
                done={metrics.commissionsToTarget === 0}
                target
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <KPI label="Break-even Volume" value={fmtAED(metrics.breakEvenSalesVolume, true)} sub={`${metrics.breakEvenUnits} units`} />
              <KPI label="Target Volume" value={fmtAED(metrics.requiredSalesVolume, true)} sub={`${metrics.requiredUnits} units`} />
              <KPI label="Budget Variance" value={`${signPrefix(metrics.budgetVariance)}${fmtAED(metrics.budgetVariance, true)}`} sub="vs allocated" colored={metrics.budgetVariance} />
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="ROAS" value={metrics.roas > 0 ? `${metrics.roas.toFixed(2)}×` : '—'} sub="Commission / Mktg" />
            <KPICard label="CPQL" value={metrics.cpql > 0 ? fmtAED(metrics.cpql, true) : '—'} sub="per qualified lead" />
            <KPICard label="Cost / Closure" value={metrics.costPerClosure > 0 ? fmtAED(metrics.costPerClosure, true) : '—'} sub={`${metrics.closureCount} closure${metrics.closureCount !== 1 ? 's' : ''}`} />
            <KPICard label="Mktg Spend" value={fmtAED(metrics.marketingSpend, true)} sub="Meta Ads + Collateral" />
          </div>

          {/* Qualified Leads */}
          <div className="bg-white rounded-xl border border-bone shadow-sm p-4 flex items-center gap-4">
            <div className="text-sm font-medium text-ink">Qualified Leads</div>
            {leadsEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0"
                  className="border border-navy rounded px-2 py-1 text-sm w-24"
                  value={leadsVal}
                  onChange={e => setLeadsVal(e.target.value)}
                  autoFocus
                />
                <button
                  className="bg-navy text-white text-xs px-3 py-1.5 rounded"
                  onClick={() => {
                    dispatch({ type: 'UPDATE_EVENT', payload: { id: eventId, changes: { qualifiedLeads: parseInt(leadsVal) || 0 } } });
                    setLeadsEditing(false);
                  }}
                >Save</button>
                <button className="text-ink-300 text-xs" onClick={() => setLeadsEditing(false)}>Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-navy">{event.qualifiedLeads}</span>
                <button className="text-xs text-ink-300 hover:text-navy" onClick={() => setLeadsEditing(true)}>Edit</button>
              </div>
            )}
          </div>

          {/* Cost Line Items */}
          <div className="bg-white rounded-xl border border-bone shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-bone">
              <div className="font-semibold text-sm text-ink">Cost Line Items</div>
              <button
                onClick={() => setCostModal({ phase: 'Pre-Event', category: 'Other', isActual: false })}
                className="text-xs bg-navy text-white px-3 py-1.5 rounded hover:bg-navy-600"
              >+ Add Cost</button>
            </div>
            {PHASES.map(phase => {
              const phaseItems = eventItems.filter(i => i.phase === phase);
              if (phaseItems.length === 0) return null;
              const phaseTotal = phaseItems.reduce((s, i) => s + i.amount * event.fxRateToAED, 0);
              return (
                <div key={phase}>
                  <div className="px-5 py-2 bg-sand border-b border-bone text-xs font-semibold text-ink-300 uppercase tracking-wider flex justify-between">
                    <span>{phase}</span>
                    <span>{fmtAED(phaseTotal, true)}</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-ink-300">
                        <th className="px-5 py-2 text-left font-medium">Category</th>
                        <th className="px-2 py-2 text-left font-medium">Description</th>
                        <th className="px-2 py-2 text-right font-medium">{event.currency}</th>
                        <th className="px-2 py-2 text-right font-medium">AED</th>
                        <th className="px-2 py-2 text-center font-medium">Type</th>
                        <th className="px-3 py-2 text-center font-medium">Date</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {phaseItems.map(item => (
                        <tr key={item.id} className="border-t border-bone/50 hover:bg-sand/50">
                          <td className="px-5 py-2 font-medium text-ink">{item.category}</td>
                          <td className="px-2 py-2 text-ink-500">{item.description}</td>
                          <td className="px-2 py-2 text-right">{fmtCurrency(item.amount, event.currency)}</td>
                          <td className="px-2 py-2 text-right font-medium text-ink">{fmtAED(item.amount * event.fxRateToAED, true)}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.isActual ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {item.isActual ? 'Actual' : 'Budget'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-ink-300">{fmtDate(item.date)}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => setCostModal({ ...item, amount: item.amount } as any)}
                              className="text-ink-300 hover:text-navy mr-2"
                            >✎</button>
                            <button
                              onClick={() => { if (confirm('Delete?')) dispatch({ type: 'DELETE_COST_ITEM', payload: item.id }); }}
                              className="text-ink-300 hover:text-red-600"
                            >✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
            <div className="px-5 py-3 border-t border-bone bg-sand flex justify-between text-sm font-semibold">
              <span>Total Cost</span>
              <span>{fmtAED(metrics.totalCostAED)}</span>
            </div>
          </div>

          {/* Closures */}
          <div className="bg-white rounded-xl border border-bone shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-bone">
              <div className="font-semibold text-sm text-ink">Closures ({eventClosures.length})</div>
              <button
                onClick={() => setClosureModal({ status: 'Reserved', closeDate: new Date().toISOString().slice(0, 10) })}
                className="text-xs bg-navy text-white px-3 py-1.5 rounded hover:bg-navy-600"
              >+ Add Closure</button>
            </div>
            {eventClosures.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-ink-300">
                    <th className="px-5 py-2 text-left font-medium">Client</th>
                    <th className="px-2 py-2 text-right font-medium">Property Value</th>
                    <th className="px-2 py-2 text-right font-medium">Comm. Rate</th>
                    <th className="px-2 py-2 text-right font-medium">Commission</th>
                    <th className="px-2 py-2 text-center font-medium">Status</th>
                    <th className="px-3 py-2 text-center font-medium">Date</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {eventClosures.map(c => (
                    <tr key={c.id} className="border-t border-bone/50 hover:bg-sand/50">
                      <td className="px-5 py-2 font-medium text-ink">{c.clientRef}</td>
                      <td className="px-2 py-2 text-right">{fmtAED(c.propertyValue)}</td>
                      <td className="px-2 py-2 text-right">{fmtPct(c.commissionRateOverride ?? event.commissionRate)}</td>
                      <td className="px-2 py-2 text-right font-semibold text-emerald-700">{fmtAED(c.commissionEarned)}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-ink-300">{fmtDate(c.closeDate)}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setClosureModal({ ...c, commissionRateOverride: c.commissionRateOverride } as any)} className="text-ink-300 hover:text-navy mr-2">✎</button>
                        <button onClick={() => { if (confirm('Delete closure?')) dispatch({ type: 'DELETE_CLOSURE', payload: c.id }); }} className="text-ink-300 hover:text-red-600">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-bone bg-sand">
                    <td colSpan={3} className="px-5 py-3 text-sm font-semibold">Total Commission</td>
                    <td className="px-2 py-3 text-right font-semibold text-emerald-700">{fmtAED(metrics.totalCommissionAED)}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div className="px-5 py-8 text-center text-xs text-ink-300">No closures yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Cost Modal */}
      {costModal && (
        <Modal title={costModal.id ? 'Edit Cost Item' : 'Add Cost Item'} onClose={() => setCostModal(null)}>
          <CostForm
            initial={costModal}
            currency={event.currency}
            fxRate={event.fxRateToAED}
            onSave={saveCost}
            onClose={() => setCostModal(null)}
          />
        </Modal>
      )}

      {/* Closure Modal */}
      {closureModal && (
        <Modal title={closureModal.id ? 'Edit Closure' : 'Add Closure'} onClose={() => setClosureModal(null)}>
          <ClosureForm
            initial={closureModal}
            defaultRate={event.commissionRate}
            onSave={saveClosure}
            onClose={() => setClosureModal(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function StageSelect({ event }: { event: Event }) {
  const { dispatch } = useApp();
  const STAGES = ['Planned', 'Pre-Event', 'Live', 'Post-Event', 'Closed'];
  return (
    <select
      value={event.stage}
      onChange={e => dispatch({ type: 'UPDATE_EVENT', payload: { id: event.id, changes: { stage: e.target.value as any } } })}
      className="bg-white/10 text-white border border-white/30 rounded px-2 py-1 text-xs focus:outline-none"
    >
      {STAGES.map(s => <option key={s} value={s} className="text-ink">{s}</option>)}
    </select>
  );
}

function BEMetric({ label, value, sub, pos, colored }: { label: string; value: string; sub: string; pos?: boolean; colored?: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-300 mb-1">{label}</div>
      <div className={`text-xl font-bold ${colored !== undefined ? signClass(colored) : pos ? 'text-emerald-700' : 'text-ink'}`}>{value}</div>
      <div className="text-[10px] text-ink-300">{sub}</div>
    </div>
  );
}

function NeedCard({ label, commNeeded, units, done, target }: {
  label: string; commNeeded: number; units: number; done: boolean; target?: boolean;
}) {
  if (done) {
    return (
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
        <div className="text-xs text-emerald-600 font-medium">{label}</div>
        <div className="text-sm font-bold text-emerald-700 mt-1">✓ Achieved</div>
      </div>
    );
  }
  return (
    <div className={`rounded-lg p-3 border ${target ? 'bg-brass-pale border-brass/30' : 'bg-amber-50 border-amber-200'}`}>
      <div className={`text-xs font-medium ${target ? 'text-brass-dark' : 'text-amber-700'}`}>{label}</div>
      <div className={`text-base font-bold mt-1 ${target ? 'text-brass-dark' : 'text-amber-800'}`}>{fmtAED(commNeeded)}</div>
      <div className="text-[11px] text-ink-300 mt-0.5">{units} more unit{units !== 1 ? 's' : ''} needed</div>
    </div>
  );
}

function KPI({ label, value, sub, colored }: { label: string; value: string; sub: string; colored?: number }) {
  return (
    <div className="bg-sand rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-ink-300">{label}</div>
      <div className={`text-sm font-bold mt-1 ${colored !== undefined ? signClass(colored) : 'text-ink'}`}>{value}</div>
      <div className="text-[10px] text-ink-300 mt-0.5">{sub}</div>
    </div>
  );
}

function KPICard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-bone shadow-sm p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-300 mb-1">{label}</div>
      <div className="text-xl font-bold text-ink">{value}</div>
      <div className="text-[10px] text-ink-300 mt-0.5">{sub}</div>
    </div>
  );
}

function CostForm({ initial, currency, fxRate, onSave, onClose }: {
  initial: Partial<CostLineItem>;
  currency: string;
  fxRate: number;
  onSave: (f: any) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    phase: initial.phase ?? 'Pre-Event',
    category: initial.category ?? 'Other',
    description: initial.description ?? '',
    amount: initial.amount ? String(initial.amount) : '',
    isActual: initial.isActual ?? false,
    date: initial.date ?? new Date().toISOString().slice(0, 10),
  });
  const inputCls = 'w-full border border-bone rounded px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-navy';
  const labelCls = 'block text-xs font-medium text-ink-500 mb-1';
  const aedPreview = parseFloat(f.amount) ? fmtAED(parseFloat(f.amount) * fxRate) : null;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...initial, ...f }); }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Phase</label>
          <select className={inputCls} value={f.phase} onChange={e => setF(p => ({ ...p, phase: e.target.value as CostPhase }))}>
            {PHASES.map(ph => <option key={ph}>{ph}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value as CostCategory }))}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Description</label>
          <input className={inputCls} value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} required />
        </div>
        <div>
          <label className={labelCls}>Amount ({currency})</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} required />
          {aedPreview && <div className="text-[10px] text-ink-300 mt-1">≈ {aedPreview}</div>}
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" className={inputCls} value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" id="isActual" checked={f.isActual} onChange={e => setF(p => ({ ...p, isActual: e.target.checked }))} className="rounded border-bone" />
          <label htmlFor="isActual" className="text-sm text-ink">Mark as Actual (confirmed spend)</label>
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" className="flex-1 bg-navy text-white text-sm py-2 rounded">Save</button>
        <button type="button" onClick={onClose} className="flex-1 border border-bone text-ink-500 text-sm py-2 rounded">Cancel</button>
      </div>
    </form>
  );
}

function ClosureForm({ initial, defaultRate, onSave, onClose }: {
  initial: Partial<Closure>;
  defaultRate: number;
  onSave: (f: any) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({
    clientRef: initial.clientRef ?? '',
    propertyValue: initial.propertyValue ? String(initial.propertyValue) : '',
    commissionRateOverride: initial.commissionRateOverride ? String(initial.commissionRateOverride * 100) : '',
    status: initial.status ?? 'Reserved',
    closeDate: initial.closeDate ?? new Date().toISOString().slice(0, 10),
  });
  const inputCls = 'w-full border border-bone rounded px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-navy';
  const labelCls = 'block text-xs font-medium text-ink-500 mb-1';
  const rate = f.commissionRateOverride ? parseFloat(f.commissionRateOverride) / 100 : defaultRate;
  const commPreview = parseFloat(f.propertyValue) ? fmtAED(parseFloat(f.propertyValue) * rate) : null;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...initial, ...f }); }} className="space-y-3">
      <div>
        <label className={labelCls}>Client Reference</label>
        <input className={inputCls} value={f.clientRef} onChange={e => setF(p => ({ ...p, clientRef: e.target.value }))} required placeholder="Client name or deal ref" />
      </div>
      <div>
        <label className={labelCls}>Property Value (AED)</label>
        <input type="number" min="0" className={inputCls} value={f.propertyValue} onChange={e => setF(p => ({ ...p, propertyValue: e.target.value }))} required placeholder="e.g. 4500000" />
      </div>
      <div>
        <label className={labelCls}>Commission Rate Override (% — leave blank to use event default of {fmtPct(defaultRate)})</label>
        <input type="number" step="0.01" min="0" max="100" className={inputCls} value={f.commissionRateOverride} onChange={e => setF(p => ({ ...p, commissionRateOverride: e.target.value }))} placeholder={`Default: ${(defaultRate * 100).toFixed(2)}%`} />
        {commPreview && <div className="text-[10px] text-emerald-700 mt-1">Commission: {commPreview}</div>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={f.status} onChange={e => setF(p => ({ ...p, status: e.target.value as ClosureStatus }))}>
            {CLOSURE_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Close Date</label>
          <input type="date" className={inputCls} value={f.closeDate} onChange={e => setF(p => ({ ...p, closeDate: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button type="submit" className="flex-1 bg-navy text-white text-sm py-2 rounded">Save Closure</button>
        <button type="button" onClick={onClose} className="flex-1 border border-bone text-ink-500 text-sm py-2 rounded">Cancel</button>
      </div>
    </form>
  );
}

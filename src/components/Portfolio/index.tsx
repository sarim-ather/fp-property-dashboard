import { useState, type ChangeEvent } from 'react';
import { useApp } from '../../context/AppContext';
import { computeEventMetrics, computeAvailableToReallocate, computePortfolioSummary } from '../../utils/calculations';
import { fmtAED, fmtDateRange, fmtPct, signClass, signPrefix, uid } from '../../utils/format';
import type { Event, EventStage, Currency } from '../../types';
import Modal from '../shared/Modal';

const STAGES: EventStage[] = ['Planned', 'Pre-Event', 'Live', 'Post-Event', 'Closed'];

const STAGE_COLORS: Record<EventStage, string> = {
  'Planned':    'bg-slate-100 text-slate-700',
  'Pre-Event':  'bg-blue-100 text-blue-800',
  'Live':       'bg-emerald-100 text-emerald-800',
  'Post-Event': 'bg-amber-100 text-amber-800',
  'Closed':     'bg-purple-100 text-purple-800',
};

const CURRENCIES: Currency[] = ['AED', 'USD', 'ZAR', 'SGD', 'AUD', 'MUR', 'EUR', 'GBP'];
const MARKETS = ['UAE', 'USA', 'South Africa', 'Singapore', 'Australia', 'Mauritius', 'UK', 'Canada', 'India', 'Other'];

interface EventFormData {
  name: string; market: string; city: string;
  startDate: string; endDate: string; stage: EventStage;
  currency: Currency; fxRateToAED: string; allocatedBudget: string;
  commissionRate: string; avgUnitPrice: string; targetProfitMargin: string;
  qualifiedLeads: string;
}

const blankForm = (settings: { defaultCommissionRate: number; defaultTargetProfitMargin: number; fxRates: Record<string, number> }): EventFormData => ({
  name: '', market: 'UAE', city: '',
  startDate: '', endDate: '', stage: 'Planned',
  currency: 'AED', fxRateToAED: '1.0', allocatedBudget: '',
  commissionRate: String(settings.defaultCommissionRate * 100),
  avgUnitPrice: '',
  targetProfitMargin: String(settings.defaultTargetProfitMargin * 100),
  qualifiedLeads: '0',
});

function EventForm({ initial, onSave, onClose }: {
  initial: EventFormData;
  onSave: (f: EventFormData) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState(initial);
  const set = (key: keyof EventFormData) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [key]: e.target.value }));

  const labelCls = 'block text-xs font-medium text-ink-500 mb-1';
  const inputCls = 'w-full border border-bone rounded px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-navy';

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className={labelCls}>Event Name *</label>
          <input className={inputCls} value={f.name} onChange={set('name')} required placeholder="e.g. London Roadshow 2026" />
        </div>
        <div>
          <label className={labelCls}>Market *</label>
          <select className={inputCls} value={f.market} onChange={set('market')}>
            {MARKETS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>City *</label>
          <input className={inputCls} value={f.city} onChange={set('city')} required placeholder="e.g. London" />
        </div>
        <div>
          <label className={labelCls}>Start Date *</label>
          <input type="date" className={inputCls} value={f.startDate} onChange={set('startDate')} required />
        </div>
        <div>
          <label className={labelCls}>End Date *</label>
          <input type="date" className={inputCls} value={f.endDate} onChange={set('endDate')} required />
        </div>
        <div>
          <label className={labelCls}>Stage</label>
          <select className={inputCls} value={f.stage} onChange={set('stage')}>
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select className={inputCls} value={f.currency} onChange={set('currency')}>
            {CURRENCIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>FX Rate to AED</label>
          <input type="number" step="0.0001" min="0" className={inputCls} value={f.fxRateToAED} onChange={set('fxRateToAED')} required />
        </div>
        <div>
          <label className={labelCls}>Allocated Budget (AED) *</label>
          <input type="number" min="0" className={inputCls} value={f.allocatedBudget} onChange={set('allocatedBudget')} required placeholder="200000" />
        </div>
        <div>
          <label className={labelCls}>Commission Rate (%)</label>
          <input type="number" step="0.1" min="0" max="100" className={inputCls} value={f.commissionRate} onChange={set('commissionRate')} required />
        </div>
        <div>
          <label className={labelCls}>Avg Unit Price (AED)</label>
          <input type="number" min="0" className={inputCls} value={f.avgUnitPrice} onChange={set('avgUnitPrice')} required placeholder="4000000" />
        </div>
        <div>
          <label className={labelCls}>Target Profit Margin (%)</label>
          <input type="number" step="1" min="0" max="500" className={inputCls} value={f.targetProfitMargin} onChange={set('targetProfitMargin')} required />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 bg-navy text-white text-sm py-2 rounded hover:bg-navy-600 transition-colors">Save Event</button>
        <button type="button" onClick={onClose} className="flex-1 border border-bone text-ink-500 text-sm py-2 rounded hover:bg-bone transition-colors">Cancel</button>
      </div>
    </form>
  );
}

export default function Portfolio() {
  const { state, dispatch } = useApp();
  const { events, costLineItems, closures, corporatePool, settings } = state.data;
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const available = computeAvailableToReallocate(events, costLineItems, closures, corporatePool, settings);
  const portfolio = computePortfolioSummary(events, costLineItems, closures);
  const totalAllocated = events.reduce((s, e) => s + e.allocatedBudget, 0);

  function saveEvent(f: EventFormData, existing?: Event) {
    const evt: Event = {
      id: existing?.id ?? uid(),
      name: f.name,
      market: f.market,
      city: f.city,
      startDate: f.startDate,
      endDate: f.endDate,
      stage: f.stage as EventStage,
      currency: f.currency as Currency,
      fxRateToAED: parseFloat(f.fxRateToAED),
      allocatedBudget: parseFloat(f.allocatedBudget),
      commissionRate: parseFloat(f.commissionRate) / 100,
      avgUnitPrice: parseFloat(f.avgUnitPrice),
      targetProfitMargin: parseFloat(f.targetProfitMargin) / 100,
      qualifiedLeads: parseInt(f.qualifiedLeads) || 0,
    };
    if (existing) {
      dispatch({ type: 'UPDATE_EVENT', payload: { id: existing.id, changes: evt } });
    } else {
      dispatch({ type: 'CREATE_EVENT', payload: evt });
    }
    setShowForm(false);
    setEditingEvent(null);
  }

  const formInitial = editingEvent
    ? {
        name: editingEvent.name, market: editingEvent.market, city: editingEvent.city,
        startDate: editingEvent.startDate, endDate: editingEvent.endDate, stage: editingEvent.stage,
        currency: editingEvent.currency, fxRateToAED: String(editingEvent.fxRateToAED),
        allocatedBudget: String(editingEvent.allocatedBudget),
        commissionRate: String(editingEvent.commissionRate * 100),
        avgUnitPrice: String(editingEvent.avgUnitPrice),
        targetProfitMargin: String(editingEvent.targetProfitMargin * 100),
        qualifiedLeads: String(editingEvent.qualifiedLeads),
      }
    : blankForm(settings);

  return (
    <div className="flex flex-col h-full">
      {/* Portfolio header */}
      <div className="bg-navy text-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">FP Property — Roadshow Portfolio</h1>
            <p className="text-navy-200 text-xs mt-0.5">Corporate event budget & profitability tracker</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-brass text-ink text-sm font-semibold px-4 py-2 rounded hover:bg-brass-light transition-colors"
          >
            + New Event
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <KPITile label="Corporate Pool" value={fmtAED(corporatePool.totalPool, true)} sub="" light />
          <KPITile label="Allocated" value={fmtAED(totalAllocated, true)} sub="" light />
          <KPITile label="Available to Reallocate" value={fmtAED(available, true)} sub="" highlight />
          <KPITile label="Portfolio Net P&L" value={`${signPrefix(portfolio.netPnL)}${fmtAED(portfolio.netPnL, true)}`} sub="" pos={portfolio.netPnL >= 0} light />
          <KPITile label="Portfolio ROI" value={fmtPct(portfolio.roi)} sub="" pos={portfolio.roi >= 0} light />
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-4 min-h-full" style={{ minWidth: `${STAGES.length * 280}px` }}>
          {STAGES.map(stage => {
            const stageEvents = events.filter(e => e.stage === stage);
            return (
              <div key={stage} className="flex flex-col w-64 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STAGE_COLORS[stage]}`}>{stage}</span>
                  <span className="text-xs text-ink-300">{stageEvents.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {stageEvents.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      metrics={computeEventMetrics(event, costLineItems, closures)}
                      onSelect={() => dispatch({ type: 'SELECT_EVENT', payload: event.id })}
                      onEdit={() => setEditingEvent(event)}
                      onDelete={() => {
                        if (confirm(`Delete "${event.name}"?`)) dispatch({ type: 'DELETE_EVENT', payload: event.id });
                      }}
                    />
                  ))}
                  {stageEvents.length === 0 && (
                    <div className="border-2 border-dashed border-bone rounded-lg p-4 text-center text-xs text-ink-300">
                      No events
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(showForm || editingEvent) && (
        <Modal
          title={editingEvent ? `Edit — ${editingEvent.name}` : 'New Event'}
          onClose={() => { setShowForm(false); setEditingEvent(null); }}
          wide
        >
          <EventForm
            initial={formInitial}
            onSave={(f) => saveEvent(f, editingEvent ?? undefined)}
            onClose={() => { setShowForm(false); setEditingEvent(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function KPITile({ label, value, sub, highlight, light, pos }: {
  label: string; value: string; sub: string;
  highlight?: boolean; light?: boolean; pos?: boolean;
}) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${highlight ? 'bg-brass text-ink' : 'bg-white/10'}`}>
      <div className="text-[10px] uppercase tracking-wider opacity-75 mb-0.5">{label}</div>
      <div className={`text-base font-bold ${highlight ? 'text-ink' : pos === false ? 'text-red-300' : pos === true ? 'text-emerald-300' : 'text-white'}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

function EventCard({ event, metrics, onSelect, onEdit, onDelete }: {
  event: Event;
  metrics: ReturnType<typeof computeEventMetrics>;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const spendPct = event.allocatedBudget > 0
    ? Math.min(metrics.totalCostAED / event.allocatedBudget, 1) * 100
    : 0;
  const overBudget = metrics.totalCostAED > event.allocatedBudget;

  return (
    <div
      className="bg-white rounded-lg border border-bone shadow-sm hover:border-navy/40 hover:shadow-md transition-all cursor-pointer group"
      onClick={onSelect}
    >
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-1 mb-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm text-ink truncate">{event.name}</div>
            <div className="text-xs text-ink-300 mt-0.5">{event.city} · {event.currency}</div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="text-ink-300 hover:text-navy text-xs px-1"
              title="Edit"
            >✎</button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="text-ink-300 hover:text-red-600 text-xs px-1"
              title="Delete"
            >✕</button>
          </div>
        </div>

        <div className="text-xs text-ink-300 mb-2.5">{fmtDateRange(event.startDate, event.endDate)}</div>

        {/* Budget bar */}
        <div className="mb-2.5">
          <div className="flex justify-between text-[10px] text-ink-300 mb-1">
            <span>Spend</span>
            <span>{fmtAED(metrics.totalCostAED, true)} / {fmtAED(event.allocatedBudget, true)}</span>
          </div>
          <div className="h-1.5 bg-bone rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? 'bg-red-500' : 'bg-navy'}`}
              style={{ width: `${spendPct}%` }}
            />
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <Metric label="Commission" value={fmtAED(metrics.totalCommissionAED, true)} />
          <Metric label="Net P&L" value={`${signPrefix(metrics.netPnL)}${fmtAED(metrics.netPnL, true)}`} colored={metrics.netPnL} />
          {metrics.commissionsStillNeeded > 0 && event.stage !== 'Closed' && (
            <div className="col-span-2 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-[10px] text-amber-800">
              Need {fmtAED(metrics.commissionsStillNeeded, true)} · {metrics.unitsStillNeeded} unit{metrics.unitsStillNeeded !== 1 ? 's' : ''} to break even
            </div>
          )}
          {event.stage === 'Closed' && metrics.netPnL >= 0 && (
            <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 text-[10px] text-emerald-800">
              Profitable · ROI {fmtPct(metrics.roi)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, colored }: { label: string; value: string; colored?: number }) {
  return (
    <div className="bg-sand rounded px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-ink-300">{label}</div>
      <div className={`font-semibold text-xs mt-0.5 ${colored !== undefined ? signClass(colored) : 'text-ink'}`}>{value}</div>
    </div>
  );
}

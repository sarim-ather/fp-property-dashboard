import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useApp } from '../../context/AppContext';
import type { Currency, UserProfile } from '../../types';
import { exportJSON, importJSON } from '../../utils/storage';

const CURRENCIES: Currency[] = ['AED', 'USD', 'ZAR', 'SGD', 'AUD', 'MUR', 'EUR', 'GBP'];

export default function Settings() {
  const { state, dispatch } = useApp();
  const { settings, corporatePool } = state.data;
  const importRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [poolVal, setPoolVal] = useState(String(corporatePool.totalPool));

  function updateFX(currency: Currency, val: string) {
    const rate = parseFloat(val);
    if (isNaN(rate)) return;
    dispatch({
      type: 'UPDATE_SETTINGS',
      payload: { fxRates: { ...settings.fxRates, [currency]: rate } },
    });
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportSuccess('');
    try {
      const data = await importJSON(file);
      if (!data.events || !data.costLineItems) throw new Error('Invalid data structure');
      if (!confirm(`Import data? This will replace ALL current data (${data.events.length} events).`)) return;
      dispatch({ type: 'IMPORT_DATA', payload: data });
      setImportSuccess(`Imported successfully — ${data.events.length} events loaded.`);
    } catch (err: any) {
      setImportError(err.message ?? 'Import failed');
    }
    e.target.value = '';
  }

  const inputCls = 'border border-bone rounded px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-navy';
  const labelCls = 'text-xs font-medium text-ink-500';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="bg-navy text-white rounded-xl p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider">Settings</h2>
        <p className="text-navy-200 text-xs mt-1">FX rates, defaults, and data management.</p>
      </div>

      {/* Corporate Pool */}
      <Section title="Corporate Budget Pool">
        <div className="flex items-center gap-3">
          <div>
            <label className={labelCls + ' block mb-1'}>Total Pool (AED)</label>
            <div className="flex gap-2">
              <input
                type="number" min="0" step="10000"
                className={inputCls}
                value={poolVal}
                onChange={e => setPoolVal(e.target.value)}
              />
              <button
                className="bg-navy text-white text-sm px-4 py-1.5 rounded"
                onClick={() => {
                  const v = parseFloat(poolVal);
                  if (!isNaN(v)) dispatch({ type: 'UPDATE_POOL', payload: v });
                }}
              >Update</button>
            </div>
          </div>
        </div>
      </Section>

      {/* Defaults */}
      <Section title="Global Defaults">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls + ' block mb-1'}>Default Commission Rate (%)</label>
            <input
              type="number" step="0.1" min="0" max="100"
              className={inputCls + ' w-full'}
              value={(settings.defaultCommissionRate * 100).toFixed(2)}
              onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { defaultCommissionRate: parseFloat(e.target.value) / 100 } })}
            />
          </div>
          <div>
            <label className={labelCls + ' block mb-1'}>Default Target Margin (%)</label>
            <input
              type="number" step="1" min="0" max="500"
              className={inputCls + ' w-full'}
              value={(settings.defaultTargetProfitMargin * 100).toFixed(0)}
              onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { defaultTargetProfitMargin: parseFloat(e.target.value) / 100 } })}
            />
          </div>
          <div>
            <label className={labelCls + ' block mb-1'}>Surplus Cap (% of profit returned)</label>
            <input
              type="number" step="5" min="0" max="100"
              className={inputCls + ' w-full'}
              value={(settings.surplusCapPercent * 100).toFixed(0)}
              onChange={e => dispatch({ type: 'UPDATE_SETTINGS', payload: { surplusCapPercent: parseFloat(e.target.value) / 100 } })}
            />
            <div className="text-[10px] text-ink-300 mt-1">100% = all profit above break-even returns to pool</div>
          </div>
        </div>
      </Section>

      {/* FX Rates */}
      <Section title="FX Rates to AED">
        <p className="text-xs text-ink-300 mb-3">These are defaults for new events. Each event also stores its own FX rate at time of booking.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CURRENCIES.map(c => (
            <div key={c}>
              <label className={labelCls + ' block mb-1'}>{c} → AED</label>
              <input
                type="number" step="0.0001" min="0"
                className={inputCls + ' w-full'}
                value={settings.fxRates[c]}
                onChange={e => updateFX(c, e.target.value)}
                disabled={c === 'AED'}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] text-ink-300">
          Last updated manually. For live rates, replace these inputs with a rates API connector.
        </div>
      </Section>

      {/* Export / Import */}
      <Section title="Data Export & Import">
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-ink mb-1">Export all data as JSON</div>
            <div className="text-xs text-ink-300 mb-2">
              Downloads a complete backup of all events, cost items, closures, and settings.
            </div>
            <button
              className="bg-navy text-white text-sm px-4 py-2 rounded hover:bg-navy-600"
              onClick={() => exportJSON(state.data)}
            >
              Export JSON
            </button>
          </div>
          <div className="border-t border-bone pt-4">
            <div className="text-sm font-medium text-ink mb-1">Import from JSON backup</div>
            <div className="text-xs text-ink-300 mb-2">
              Replaces all current data. Use a previously exported file.
            </div>
            <button
              className="border border-navy text-navy text-sm px-4 py-2 rounded hover:bg-bone"
              onClick={() => importRef.current?.click()}
            >
              Import JSON
            </button>
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            {importError && <div className="mt-2 text-xs text-red-700 bg-red-50 rounded px-3 py-2">{importError}</div>}
            {importSuccess && <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-3 py-2">{importSuccess}</div>}
          </div>

          <div className="border-t border-bone pt-4">
            <div className="text-sm font-medium text-ink mb-1">CSV Import (Cost Line Items)</div>
            <div className="text-xs text-ink-300 mb-2">
              Expected columns: <code className="bg-bone px-1 rounded">phase, category, description, amount, isActual, date</code>
            </div>
            <div className="text-xs text-ink-300 mb-2">
              Attach to specific event via the event detail page (coming soon). For now, use JSON export/import for bulk data.
            </div>
            <button className="border border-bone text-ink-300 text-sm px-4 py-2 rounded cursor-not-allowed" disabled>
              Import CSV (costs) — attach to event
            </button>
          </div>
        </div>
      </Section>

      {/* Profile PINs */}
      <Section title="Profile PINs">
        <p className="text-xs text-ink-300 mb-4">Set 4-digit PINs for each role. Share these with your team members.</p>
        <div className="grid grid-cols-3 gap-4">
          {(['finance', 'sales', 'marketing'] as UserProfile[]).map(role => (
            <div key={role}>
              <label className={labelCls + ' block mb-1 capitalize'}>{role} PIN</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className={inputCls + ' w-full tracking-widest'}
                value={settings.pins?.[role] ?? ''}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  dispatch({
                    type: 'UPDATE_SETTINGS',
                    payload: { pins: { ...(settings.pins ?? { finance: '1111', sales: '2222', marketing: '3333' }), [role]: v } },
                  });
                }}
                placeholder="1234"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-ink-300">
          Default PINs: Finance <strong>1111</strong> · Sales <strong>2222</strong> · Marketing <strong>3333</strong>. Change these before sharing.
        </div>
      </Section>

      {/* Reset */}
      <Section title="Danger Zone">
        <div className="flex items-center gap-4">
          <button
            className="border border-red-300 text-red-700 text-sm px-4 py-2 rounded hover:bg-red-50"
            onClick={() => {
              if (confirm('Reset all data to seed/demo data? This cannot be undone.')) {
                localStorage.removeItem('fp_event_dashboard_v1');
                window.location.reload();
              }
            }}
          >
            Reset to Demo Data
          </button>
          <div className="text-xs text-ink-300">Clears localStorage and reloads with seed data</div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-bone shadow-sm p-5">
      <div className="font-semibold text-sm text-ink mb-4 pb-3 border-b border-bone">{title}</div>
      {children}
    </div>
  );
}

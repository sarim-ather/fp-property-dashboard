# FP Property — Event Budgeting & Profitability Dashboard

A self-contained single-page application for tracking roadshow event budgets, commission closures, and portfolio-level profitability for a Dubai-based real estate brokerage.

## Quick Start

```bash
npm install
npm run dev
```

Opens at http://localhost:5173 with seed data pre-loaded (6 sample events across USA, South Africa, Singapore, Australia, Mauritius, UAE).

## Features

- **Portfolio Kanban** — events grouped by stage (Planned → Pre-Event → Live → Post-Event → Closed)
- **Break-even Engine** — "closures needed" in AED and units, progress bar
- **Cost Tracking** — budgeted vs actual line items by phase, auto-converted to AED
- **Closure Management** — commission auto-calculated, per-closure status (Reserved → SPA Signed → Paid)
- **Reallocation** — move underspend/surplus from closed events into upcoming ones
- **Market Baselines** — benchmark table from closed events
- **FX** — local currency amounts stored per event, converted at the stored FX rate
- **Persistence** — localStorage auto-save; JSON export/import for backup

## Data Model

```
AppData
├── events[]           — core event record (budget, rates, stage)
├── costLineItems[]    — cost entries (phase, category, local amount, isActual flag)
├── closures[]         — closed deals (property value, commission earned, status)
├── reallocations[]    — budget transfers log
├── corporatePool      — totalPool AED
└── settings           — FX rates, defaults, surplusCapPercent
```

### Key Calculations

| Metric | Formula |
|--------|---------|
| Total Cost AED | Σ (amount × fxRateToAED) for all line items |
| Break-even Volume | totalCostAED / commissionRate |
| Break-even Units | ⌈totalCostAED / (commissionRate × avgUnitPrice)⌉ |
| Target Volume | totalCostAED × (1 + targetMargin) / commissionRate |
| Net P&L | commissionEarned − totalCostAED |
| ROI | netPnL / totalCostAED |
| ROAS | commissionEarned / marketingSpend |
| CPQL | marketingSpend / qualifiedLeads |
| Budget Variance | allocatedBudget − totalCostAED |
| Recoverable to Pool | underspend + netPnL × surplusCapPercent (Closed events only) |

## Future Connectors (stubs)

`src/utils/stubs.ts` contains placeholder functions:
- `fetchMetaAdsSpend()` — wire to Meta Ads Marketing API
- `fetchClosuresFromCRM()` — wire to Hostick CRM API

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS v3 (ink/navy/brass luxury palette)
- localStorage persistence
- No backend required

import type { AppData } from '../types';
import {
  computeEventMetrics,
  computeAvailableToReallocate,
  computePortfolioSummary,
} from './calculations';

function aed(n: number): string {
  return `AED ${Math.round(n).toLocaleString()}`;
}
function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
}

export function formatPortfolioContext(data: AppData): string {
  const { events, costLineItems, closures, reallocations, corporatePool, settings } = data;

  const available = computeAvailableToReallocate(events, costLineItems, closures, corporatePool, settings);
  const portfolio = computePortfolioSummary(events, costLineItems, closures);
  const totalAllocated = events.reduce((s, e) => s + e.allocatedBudget, 0);

  const lines: string[] = [
    `# FP Property — Live Portfolio Data`,
    ``,
    `## Corporate Budget`,
    `Total Pool: ${aed(corporatePool.totalPool)}`,
    `Total Allocated: ${aed(totalAllocated)}`,
    `Unallocated Buffer: ${aed(corporatePool.totalPool - totalAllocated)}`,
    `Available to Reallocate: ${aed(available)}`,
    `Portfolio Net P&L: ${aed(portfolio.netPnL)} | ROI: ${pct(portfolio.roi)}`,
    ``,
    `## Events (${events.length} total)`,
  ];

  for (const event of events) {
    const m = computeEventMetrics(event, costLineItems, closures);
    const eventClosures = closures.filter(c => c.eventId === event.id);

    lines.push(``);
    lines.push(`### ${event.name} [${event.stage}]`);
    lines.push(`Market: ${event.market} | City: ${event.city} | Dates: ${event.startDate} – ${event.endDate}`);
    lines.push(`Currency: ${event.currency} (×${event.fxRateToAED} to AED) | Commission rate: ${(event.commissionRate * 100).toFixed(1)}%`);
    lines.push(`Avg unit price: ${aed(event.avgUnitPrice)} | Target margin: ${(event.targetProfitMargin * 100).toFixed(0)}%`);
    lines.push(`Allocated budget: ${aed(event.allocatedBudget)}`);
    lines.push(`Total cost: ${aed(m.totalCostAED)} | Budget variance: ${aed(m.budgetVariance)} ${m.budgetVariance >= 0 ? '(under budget)' : '(over budget)'}`);
    lines.push(`Commission earned: ${aed(m.totalCommissionAED)} | Net P&L: ${aed(m.netPnL)} | ROI: ${pct(m.roi)}`);
    lines.push(`Break-even progress: ${(Math.min(m.progressToBreakEven, 1) * 100).toFixed(1)}%`);

    if (m.unitsStillNeeded > 0) {
      lines.push(`To break even: need ${aed(m.commissionsStillNeeded)} more commission (≈${m.unitsStillNeeded} unit${m.unitsStillNeeded > 1 ? 's' : ''})`);
      lines.push(`To hit ${(event.targetProfitMargin * 100).toFixed(0)}% target: need ${aed(m.commissionsToTarget)} more (≈${m.unitsToTarget} unit${m.unitsToTarget > 1 ? 's' : ''})`);
    }

    lines.push(`Marketing spend: ${aed(m.marketingSpend)} | ROAS: ${m.roas.toFixed(2)}x | Qualified leads: ${event.qualifiedLeads}`);
    if (event.qualifiedLeads > 0) lines.push(`CPQL: ${aed(m.cpql)}`);

    if (eventClosures.length > 0) {
      lines.push(`Closures (${eventClosures.length}):`);
      for (const c of eventClosures) {
        lines.push(`  - ${c.clientRef}: property ${aed(c.propertyValue)}, commission ${aed(c.commissionEarned)} [${c.status}] ${c.closeDate}`);
      }
    } else {
      lines.push(`Closures: none yet`);
    }
  }

  if (reallocations.length > 0) {
    lines.push(``);
    lines.push(`## Reallocation History`);
    for (const r of reallocations) {
      const src = events.find(e => e.id === r.sourceEventId)?.name ?? 'Pool';
      const tgt = events.find(e => e.id === r.targetEventId)?.name ?? '?';
      lines.push(`- ${r.date}: ${src} → ${tgt}: ${aed(r.amount)} — "${r.note}"`);
    }
  }

  lines.push(``);
  lines.push(`## Settings`);
  lines.push(`Default commission: ${(settings.defaultCommissionRate * 100).toFixed(1)}% | Default target margin: ${(settings.defaultTargetProfitMargin * 100).toFixed(0)}% | Surplus cap: ${(settings.surplusCapPercent * 100).toFixed(0)}%`);

  return lines.join('\n');
}

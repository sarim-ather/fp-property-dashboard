import type { Event, CostLineItem, Closure, EventMetrics, MarketBaseline, CorporatePool, Settings } from '../types';

export function eventCostItems(eventId: string, items: CostLineItem[]): CostLineItem[] {
  return items.filter(i => i.eventId === eventId);
}

export function eventClosures(eventId: string, closures: Closure[]): Closure[] {
  return closures.filter(c => c.eventId === eventId);
}

export function toAED(amount: number, fxRate: number): number {
  return amount * fxRate;
}

export function computeEventMetrics(
  event: Event,
  allItems: CostLineItem[],
  allClosures: Closure[]
): EventMetrics {
  const items = eventCostItems(event.id, allItems);
  const closures = eventClosures(event.id, allClosures);

  const totalCostAED = items.reduce((s, i) => s + toAED(i.amount, event.fxRateToAED), 0);

  const marketingSpend = items
    .filter(i => i.category === 'Marketing/Meta Ads' || i.category === 'Collateral/Print')
    .reduce((s, i) => s + toAED(i.amount, event.fxRateToAED), 0);

  const totalCommissionAED = closures.reduce((s, c) => s + c.commissionEarned, 0);
  const closureCount = closures.length;

  const cr = event.commissionRate;
  const avgUnit = event.avgUnitPrice;
  const tm = event.targetProfitMargin;

  const breakEvenSalesVolume = cr > 0 ? totalCostAED / cr : 0;
  const breakEvenUnits = cr > 0 && avgUnit > 0
    ? Math.ceil(totalCostAED / (cr * avgUnit))
    : 0;

  const requiredCommission = totalCostAED * (1 + tm);
  const requiredSalesVolume = cr > 0 ? requiredCommission / cr : 0;
  const requiredUnits = cr > 0 && avgUnit > 0
    ? Math.ceil(requiredSalesVolume / avgUnit)
    : 0;

  const netPnL = totalCommissionAED - totalCostAED;
  const roi = totalCostAED > 0 ? netPnL / totalCostAED : 0;
  const roas = marketingSpend > 0 ? totalCommissionAED / marketingSpend : 0;
  const cpql = event.qualifiedLeads > 0 ? marketingSpend / event.qualifiedLeads : 0;
  const costPerClosure = closureCount > 0 ? totalCostAED / closureCount : 0;
  const budgetVariance = event.allocatedBudget - totalCostAED;
  const progressToBreakEven = totalCostAED > 0
    ? Math.min(totalCommissionAED / totalCostAED, 1.5) // allow slightly over 100% for display
    : 0;

  const commissionsStillNeeded = Math.max(0, totalCostAED - totalCommissionAED);
  const unitsStillNeeded = cr > 0 && avgUnit > 0
    ? Math.max(0, Math.ceil(commissionsStillNeeded / (cr * avgUnit)))
    : 0;

  const commissionsToTarget = Math.max(0, requiredCommission - totalCommissionAED);
  const unitsToTarget = cr > 0 && avgUnit > 0
    ? Math.max(0, Math.ceil(commissionsToTarget / (cr * avgUnit)))
    : 0;

  return {
    totalCostAED,
    totalCommissionAED,
    marketingSpend,
    breakEvenSalesVolume,
    breakEvenUnits,
    requiredSalesVolume,
    requiredUnits,
    netPnL,
    roi,
    roas,
    cpql,
    costPerClosure,
    budgetVariance,
    progressToBreakEven,
    commissionsStillNeeded,
    unitsStillNeeded,
    commissionsToTarget,
    unitsToTarget,
    closureCount,
  };
}

export function recoverableToPool(
  event: Event,
  metrics: EventMetrics,
  surplusCapPercent: number
): number {
  if (event.stage !== 'Closed') return 0;
  const underspend = Math.max(0, metrics.budgetVariance);
  const surplusProfit = Math.max(0, metrics.netPnL) * surplusCapPercent;
  return underspend + surplusProfit;
}

export function computeAvailableToReallocate(
  events: Event[],
  items: CostLineItem[],
  closures: Closure[],
  corporatePool: CorporatePool,
  settings: Settings
): number {
  const totalAllocated = events.reduce((s, e) => s + e.allocatedBudget, 0);
  const unallocated = Math.max(0, corporatePool.totalPool - totalAllocated);

  const closedRecoverable = events
    .filter(e => e.stage === 'Closed')
    .reduce((s, e) => {
      const m = computeEventMetrics(e, items, closures);
      // Subtract allocatedBudget since that was already taken from pool
      // Return only what's "extra" — underspend relative to total cost, plus net profit
      const underspend = Math.max(0, e.allocatedBudget - m.totalCostAED);
      const profit = Math.max(0, m.netPnL) * settings.surplusCapPercent;
      return s + underspend + profit;
    }, 0);

  return unallocated + closedRecoverable;
}

export function computePortfolioSummary(
  events: Event[],
  items: CostLineItem[],
  closures: Closure[]
) {
  const allMetrics = events.map(e => computeEventMetrics(e, items, closures));
  const totalCost = allMetrics.reduce((s, m) => s + m.totalCostAED, 0);
  const totalCommission = allMetrics.reduce((s, m) => s + m.totalCommissionAED, 0);
  const netPnL = totalCommission - totalCost;
  const roi = totalCost > 0 ? netPnL / totalCost : 0;
  const totalAllocated = events.reduce((s, e) => s + e.allocatedBudget, 0);
  return { totalCost, totalCommission, netPnL, roi, totalAllocated };
}

export function computeMarketBaselines(
  events: Event[],
  items: CostLineItem[],
  closures: Closure[]
): MarketBaseline[] {
  const closed = events.filter(e => e.stage === 'Closed');
  const markets = [...new Set(closed.map(e => e.market))].sort();

  return markets.map(market => {
    const evs = closed.filter(e => e.market === market);
    const mx = evs.map(e => computeEventMetrics(e, items, closures));
    const n = evs.length;
    return {
      market,
      eventCount: n,
      avgCost: mx.reduce((s, m) => s + m.totalCostAED, 0) / n,
      avgCommission: mx.reduce((s, m) => s + m.totalCommissionAED, 0) / n,
      avgROI: mx.reduce((s, m) => s + m.roi, 0) / n,
      avgCPQL: mx.reduce((s, m) => s + (isFinite(m.cpql) ? m.cpql : 0), 0) / n,
      avgCostPerClosure: mx.reduce((s, m) => s + (isFinite(m.costPerClosure) ? m.costPerClosure : 0), 0) / n,
      avgClosureCount: mx.reduce((s, m) => s + m.closureCount, 0) / n,
    };
  });
}

export function closureCommission(propertyValue: number, rate: number): number {
  return propertyValue * rate;
}

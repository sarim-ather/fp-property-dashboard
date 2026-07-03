export type EventStage = 'Planned' | 'Pre-Event' | 'Live' | 'Post-Event' | 'Closed';
export type CostPhase = 'Pre-Event' | 'Live' | 'Post-Event';
export type CostCategory =
  | 'Venue'
  | 'Flights'
  | 'Accommodation'
  | 'Visa'
  | 'Marketing/Meta Ads'
  | 'Collateral/Print'
  | 'Staff'
  | 'Hospitality'
  | 'Transport'
  | 'Sponsorship'
  | 'CRM/Follow-up'
  | 'Other';
export type ClosureStatus = 'Reserved' | 'SPA Signed' | 'Paid';
export type Currency = 'AED' | 'USD' | 'ZAR' | 'SGD' | 'AUD' | 'MUR' | 'EUR' | 'GBP';
export type Screen = 'portfolio' | 'reallocation' | 'baselines' | 'insights' | 'settings';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export interface Event {
  id: string;
  name: string;
  market: string;
  city: string;
  startDate: string;
  endDate: string;
  stage: EventStage;
  currency: Currency;
  fxRateToAED: number;
  allocatedBudget: number; // AED
  commissionRate: number; // 0–1 e.g. 0.02 = 2%
  avgUnitPrice: number; // AED
  targetProfitMargin: number; // 0–1 e.g. 0.30 = 30%
  qualifiedLeads: number;
}

export interface CostLineItem {
  id: string;
  eventId: string;
  phase: CostPhase;
  category: CostCategory;
  description: string;
  amount: number; // in event local currency
  isActual: boolean; // false = budgeted estimate
  date: string;
}

export interface Closure {
  id: string;
  eventId: string;
  clientRef: string;
  propertyValue: number; // AED
  commissionRateOverride?: number;
  commissionEarned: number; // AED — auto-calculated unless overridden
  status: ClosureStatus;
  closeDate: string;
}

export interface Reallocation {
  id: string;
  date: string;
  sourceEventId: string | null; // null = from initial unallocated pool
  targetEventId: string;
  amount: number; // AED
  note: string;
}

export interface Settings {
  defaultCommissionRate: number;
  defaultTargetProfitMargin: number;
  fxRates: Record<Currency, number>; // rate to AED
  surplusCapPercent: number; // 0–1, default 1.0
}

export interface CorporatePool {
  totalPool: number; // AED
}

export interface AppData {
  events: Event[];
  costLineItems: CostLineItem[];
  closures: Closure[];
  reallocations: Reallocation[];
  corporatePool: CorporatePool;
  settings: Settings;
}

export interface AppState {
  data: AppData;
  ui: {
    screen: Screen;
    selectedEventId: string | null;
  };
}

export interface EventMetrics {
  totalCostAED: number;
  totalCommissionAED: number;
  marketingSpend: number;
  breakEvenSalesVolume: number;
  breakEvenUnits: number;
  requiredSalesVolume: number;
  requiredUnits: number;
  netPnL: number;
  roi: number;
  roas: number;
  cpql: number;
  costPerClosure: number;
  budgetVariance: number;
  progressToBreakEven: number; // 0–1 capped
  commissionsStillNeeded: number;
  unitsStillNeeded: number;
  commissionsToTarget: number;
  unitsToTarget: number;
  closureCount: number;
}

export interface MarketBaseline {
  market: string;
  eventCount: number;
  avgCost: number;
  avgCommission: number;
  avgROI: number;
  avgCPQL: number;
  avgCostPerClosure: number;
  avgClosureCount: number;
}

// ---------------------------------------------------------------------------
// STUB FUNCTIONS — future live data connectors
// Replace the bodies below to wire up real integrations.
// ---------------------------------------------------------------------------

export interface MetaAdsCost {
  campaignName: string;
  spend: number; // USD
  impressions: number;
  leads: number;
  dateRange: { from: string; to: string };
}

/**
 * TODO: Connect to Meta Ads API (Marketing API v20+).
 * Requires: access token, ad account ID, date range.
 * Returns spend and lead data scoped to a roadshow campaign.
 */
export async function fetchMetaAdsSpend(
  _adAccountId: string,
  _campaignId: string,
  _from: string,
  _to: string
): Promise<MetaAdsCost | null> {
  console.warn('[stub] fetchMetaAdsSpend — not yet implemented');
  return null;
}

export interface CRMClosure {
  dealId: string;
  clientName: string;
  propertyValue: number; // AED
  status: string;
  closedDate: string;
  eventTag?: string;
}

/**
 * TODO: Connect to Hostick CRM API.
 * Filter deals by event tag / campaign reference.
 * Map deal statuses to ClosureStatus enum.
 */
export async function fetchClosuresFromCRM(
  _eventId: string,
  _eventTag: string
): Promise<CRMClosure[]> {
  console.warn('[stub] fetchClosuresFromCRM — not yet implemented');
  return [];
}

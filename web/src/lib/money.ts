export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

/** 10% service fee, same rule as the API. */
export const SERVICE_FEE_PERCENT = 10;

export function feeFromSubtotal(subtotalCents: number): number {
  return Math.round((subtotalCents * SERVICE_FEE_PERCENT) / 100);
}

/**
 * Fortune 500 Executive Dashboard — Number formatting
 * Thousands: 12.5K | Millions: 4.7M | Percent: 1 decimal
 */

export function formatExecutive(value: number, type: 'short' | 'currency' | 'percent' = 'short'): string {
  if (type === 'percent') return `${value.toFixed(1)}%`;
  if (type === 'currency') {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

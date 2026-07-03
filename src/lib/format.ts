export const CRORE = 10_000_000;
export const LAKH = 100_000;

// Format an amount in rupees into Indian "1,00,00,000" grouping.
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.max(0, Math.round(amount)));
}

// Human readable Cr / Lakh format
export function formatCompact(amount: number): string {
  if (amount >= CRORE) {
    const cr = amount / CRORE;
    return `${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (amount >= LAKH) {
    const l = amount / LAKH;
    return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} L`;
  }
  return `${amount}`;
}

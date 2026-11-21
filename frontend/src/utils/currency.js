/**
 * BookFlow AI currently targets Indian businesses. Keep all customer-facing
 * price/revenue display consistent in INR; numeric values remain numeric in
 * API/database payloads and are never converted here.
 */
export const formatINR = (value, options = {}) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
};

/** Format chart axes compactly without switching away from INR. */
export const formatINRCompact = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `₹${(amount / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}Cr`;
  if (abs >= 100000) return `₹${(amount / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
  if (abs >= 1000) return `₹${(amount / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}K`;
  return formatINR(amount);
};

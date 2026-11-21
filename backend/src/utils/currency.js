const formatINR = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const normalizeRupeeText = (value) => String(value ?? '')
  .replace(/\$\s*(?=\d)/g, '₹')
  .replace(/\b(?:USD|dollars?)\s*(\d[\d,]*(?:\.\d+)?)/gi, '₹$1')
  .replace(/\b(\d[\d,]*(?:\.\d+)?)\s*(?:USD|dollars?)\b/gi, '₹$1')
  .replace(/₹{2,}/g, '₹');

module.exports = { formatINR, normalizeRupeeText };

const EARN_POINTS_PER_100 = 5;
const MIN_REDEEM_POINTS = 100;
const MAX_REDEMPTION_PERCENT = 20;
const RUPEES_PER_POINT = 1;

function calculateEarnedPoints(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value / 100) * EARN_POINTS_PER_100;
}

function getMaxRedeemablePoints(balance, payableAmount) {
  const available = Math.max(0, Math.floor(Number(balance) || 0));
  const amount = Number(payableAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const maxDiscount = Math.floor((amount * MAX_REDEMPTION_PERCENT) / 100);
  return Math.min(available, Math.floor(maxDiscount / RUPEES_PER_POINT));
}

function validateRedemption({ points, balance, payableAmount }) {
  const requested = Number(points);
  if (!Number.isInteger(requested) || requested <= 0) {
    return { valid: false, error: 'Points must be a positive whole number.' };
  }
  if (requested < MIN_REDEEM_POINTS) {
    return { valid: false, error: `At least ${MIN_REDEEM_POINTS} points are required to redeem.` };
  }
  const available = Math.max(0, Math.floor(Number(balance) || 0));
  if (requested > available) return { valid: false, error: 'The customer does not have enough loyalty points.' };
  const maxRedeemable = getMaxRedeemablePoints(available, payableAmount);
  if (requested > maxRedeemable) {
    return {
      valid: false,
      error: `You can redeem up to ${maxRedeemable} points for this appointment (20% of the payable amount).`,
      maxRedeemable,
    };
  }
  return { valid: true, value: { points: requested, discountAmount: requested * RUPEES_PER_POINT } };
}

module.exports = {
  EARN_POINTS_PER_100,
  MIN_REDEEM_POINTS,
  MAX_REDEMPTION_PERCENT,
  RUPEES_PER_POINT,
  calculateEarnedPoints,
  getMaxRedeemablePoints,
  validateRedemption,
};

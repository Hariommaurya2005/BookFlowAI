const { normalizeRupeeText } = require('./currency');

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));

const buildOfferRecommendationFallback = (facts) => {
  const averagePrice = Math.max(100, Math.round(Number(facts.averageServicePrice) || 500));
  const hasCustomers = Number(facts.totalCustomers) > 0;
  return [
    {
      id: 'first-visit-welcome',
      title: 'First-visit welcome offer',
      audience: 'New customers',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscountAmount: Math.min(150, Math.round(averagePrice * 0.3)),
      minimumBookingAmount: averagePrice,
      rationale: hasCustomers
        ? 'Use a capped introductory offer to lower the first-booking barrier without discounting every visit.'
        : 'A small introductory offer can make it easier for the first customer to try the service.',
      guardrail: 'Enable first-visit-only eligibility and set a limited validity window.',
    },
    {
      id: 'repeat-visit-reward',
      title: 'Repeat-visit reward',
      audience: 'Customers with a completed visit',
      discountType: 'fixed',
      discountValue: Math.min(100, Math.max(50, Math.round(averagePrice * 0.1))),
      maxDiscountAmount: null,
      minimumBookingAmount: Math.round(averagePrice * 1.25),
      rationale: 'A modest fixed reward encourages rebooking while keeping the offer tied to a meaningful basket value.',
      guardrail: 'Limit to one redemption per customer and only count completed visits for eligibility.',
    },
    {
      id: 'off-peak-fill',
      title: 'Off-peak slot booster',
      audience: 'Customers booking selected low-demand hours',
      discountType: 'percentage',
      discountValue: 8,
      maxDiscountAmount: Math.min(100, Math.round(averagePrice * 0.2)),
      minimumBookingAmount: averagePrice,
      rationale: 'A time-limited offer for selected quieter slots can help distribute demand without discounting the whole week.',
      guardrail: 'Promote it only for the specific low-demand dates or hours chosen by the business.',
    },
  ];
};

const normalizeOfferRecommendations = (recommendations, averageServicePrice) => {
  const averagePrice = Math.max(100, Math.round(Number(averageServicePrice) || 500));
  const safe = (Array.isArray(recommendations) ? recommendations : []).slice(0, 3).map((item, index) => {
    const discountType = item?.discountType === 'fixed' ? 'fixed' : 'percentage';
    const discountValue = discountType === 'percentage'
      ? clamp(item?.discountValue, 5, 20)
      : clamp(item?.discountValue, 25, Math.max(25, Math.min(200, averagePrice * 0.3)));
    const capValue = item?.maxDiscountAmount == null
      ? null
      : clamp(item.maxDiscountAmount, 0, Math.min(300, averagePrice));
    return {
      id: `ai-recommendation-${index + 1}`,
      title: normalizeRupeeText(String(item?.title || `Promotion idea ${index + 1}`).trim()).slice(0, 100),
      audience: normalizeRupeeText(String(item?.audience || 'Eligible customers').trim()).slice(0, 120),
      discountType,
      discountValue,
      maxDiscountAmount: capValue,
      minimumBookingAmount: clamp(item?.minimumBookingAmount, 0, Math.max(averagePrice * 5, 1000)),
      rationale: normalizeRupeeText(String(item?.rationale || 'Consider testing this offer with a small eligible segment.').trim()).slice(0, 400),
      guardrail: normalizeRupeeText(String(item?.guardrail || 'Set an expiry, usage limit, and eligibility rules before publishing.').trim()).slice(0, 300),
    };
  }).filter((item) => item.title && item.rationale);
  return safe;
};

const buildRetentionSegments = (customers, completedRows, now = new Date()) => {
  const completedByCustomer = new Map((completedRows || []).map((row) => [String(row._id), row]));
  const safeCustomers = (customers || []).map((customer) => {
    const record = completedByCustomer.get(String(customer._id));
    const completedVisits = Number(record?.completedVisits) || 0;
    const lastVisit = record?.lastVisit || customer.lastVisit || null;
    const daysSinceLastVisit = lastVisit
      ? Math.max(0, Math.floor((now.getTime() - new Date(lastVisit).getTime()) / 86400000))
      : null;
    let segment = 'new';
    if (completedVisits > 0 && daysSinceLastVisit !== null && daysSinceLastVisit >= 30) segment = 'at_risk';
    else if (completedVisits >= 5) segment = 'loyal';
    else if (completedVisits > 0) segment = 'returning';
    return {
      id: String(customer._id),
      name: String(customer.name || 'Customer').slice(0, 100),
      completedVisits,
      totalSpent: Math.max(0, Number(record?.totalSpent) || 0),
      lastVisit,
      daysSinceLastVisit,
      segment,
    };
  });
  const segments = safeCustomers.reduce((acc, customer) => {
    acc[customer.segment] = (acc[customer.segment] || 0) + 1;
    return acc;
  }, { at_risk: 0, loyal: 0, returning: 0, new: 0 });
  const atRiskCustomers = safeCustomers
    .filter((customer) => customer.segment === 'at_risk')
    .sort((a, b) => (b.daysSinceLastVisit || 0) - (a.daysSinceLastVisit || 0))
    .slice(0, 10);
  return { segments, atRiskCustomers, totalCustomers: safeCustomers.length };
};

module.exports = { buildOfferRecommendationFallback, normalizeOfferRecommendations, buildRetentionSegments };

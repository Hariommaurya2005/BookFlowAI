const parsePagination = (query = {}, { defaultLimit = 10, maxLimit = 50 } = {}) => {
  const pageValue = Number.parseInt(query.page, 10);
  const limitValue = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(pageValue) && pageValue > 0 ? Math.min(pageValue, 100000) : 1;
  const limit = Number.isFinite(limitValue) && limitValue > 0
    ? Math.min(limitValue, maxLimit)
    : defaultLimit;
  return { page, limit, skip: (page - 1) * limit };
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeOrganizationStatus = (value) => {
  if (!value || value === 'all') return { valid: true, value: 'all' };
  if (value === 'active' || value === 'suspended') return { valid: true, value };
  return { valid: false, error: 'Status filter must be active, suspended, or all.' };
};

const validateStatusChangePayload = (body = {}) => {
  if (typeof body.active !== 'boolean') {
    return { valid: false, error: 'active must be a boolean.' };
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 8) {
    return { valid: false, error: 'Please provide a reason with at least 8 characters.' };
  }
  if (reason.length > 500) {
    return { valid: false, error: 'Reason must be 500 characters or fewer.' };
  }
  return { valid: true, value: { active: body.active, reason } };
};

module.exports = { parsePagination, escapeRegex, normalizeOrganizationStatus, validateStatusChangePayload };

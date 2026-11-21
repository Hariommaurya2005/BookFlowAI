const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'gmx.com', 'mail.com', 'yandex.com', 'yandex.ru', 'rediffmail.com',
]);

const isValidEmail = (value) => {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim().toLowerCase());
};

/** True only when a deployer explicitly enables B2B-only email policy. */
const isWorkEmailRequired = () => String(process.env.REQUIRE_WORK_EMAIL || 'false').toLowerCase() === 'true';

/** A practical domain check; it does not prove domain ownership. */
const isBusinessEmail = (value) => {
  if (!isValidEmail(value)) return false;
  return !PERSONAL_EMAIL_DOMAINS.has(value.trim().toLowerCase().split('@').pop());
};

const isAllowedEmail = (value) => isValidEmail(value) && (!isWorkEmailRequired() || isBusinessEmail(value));
const getEmailPolicyMessage = () => isWorkEmailRequired()
  ? 'Please use a valid work email address with your organization domain.'
  : 'Please enter a valid email address.';

module.exports = {
  isValidEmail,
  isBusinessEmail,
  isAllowedEmail,
  isWorkEmailRequired,
  getEmailPolicyMessage,
  PERSONAL_EMAIL_DOMAINS,
};

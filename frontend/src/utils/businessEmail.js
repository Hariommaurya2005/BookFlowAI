const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
  'outlook.com', 'hotmail.com', 'hotmail.co.uk', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com',
  'gmx.com', 'mail.com', 'yandex.com', 'yandex.ru', 'rediffmail.com',
]);

/** Public showcase mode accepts personal mailboxes. Turn the flag on for a B2B-only deployment. */
export function requiresBusinessEmail() {
  return String(import.meta.env.VITE_REQUIRE_WORK_EMAIL || 'false').toLowerCase() === 'true';
}

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** A practical domain check, not proof that the domain belongs to a company. */
export function isBusinessEmail(value) {
  if (!isValidEmail(value)) return false;
  const domain = value.trim().toLowerCase().split('@').pop();
  return !PERSONAL_EMAIL_DOMAINS.has(domain);
}

export function isAllowedEmail(value) {
  if (!isValidEmail(value)) return false;
  return !requiresBusinessEmail() || isBusinessEmail(value);
}

export const EMAIL_POLICY_MESSAGE = requiresBusinessEmail()
  ? 'Use a valid work email with your organization’s domain.'
  : 'Enter a valid email address, such as you@example.com.';

// Kept as a backwards-compatible named export for any existing components.
export const BUSINESS_EMAIL_MESSAGE = 'Use a valid work email with your organization’s domain.';

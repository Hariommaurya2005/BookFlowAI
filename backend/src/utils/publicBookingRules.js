const slugifyOrganizationName = (name) => String(name || '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 48)
  .replace(/-+$/g, '');

const createOrganizationSlug = (name, id) => {
  const base = slugifyOrganizationName(name) || 'business';
  const suffix = String(id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase();
  return suffix ? `${base}-${suffix}` : base;
};

const normalizePublicEmail = (email) => {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

const normalizePublicPhone = (phone) => {
  if (typeof phone !== 'string') return '';
  return phone.trim().replace(/\s+/g, ' ');
};

const validatePublicBookingContact = ({ name, email, phone, notes }) => {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = normalizePublicEmail(email);
  const normalizedPhone = normalizePublicPhone(phone);
  const normalizedNotes = typeof notes === 'string' ? notes.trim() : '';
  const errors = [];

  if (!normalizedName || normalizedName.length > 100) {
    errors.push('Name is required and must be 100 characters or fewer.');
  }
  if (!normalizedEmail && !normalizedPhone) {
    errors.push('Provide at least an email address or a phone number.');
  }
  if (normalizedEmail && (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))) {
    errors.push('Enter a valid email address.');
  }
  if (normalizedPhone && (normalizedPhone.length > 25 || !/^[0-9+().\-\s]{7,25}$/.test(normalizedPhone))) {
    errors.push('Enter a valid phone number.');
  }
  if (normalizedNotes.length > 500) errors.push('Notes must be 500 characters or fewer.');

  return {
    valid: errors.length === 0,
    errors,
    value: { name: normalizedName, email: normalizedEmail, phone: normalizedPhone, notes: normalizedNotes },
  };
};

module.exports = {
  slugifyOrganizationName,
  createOrganizationSlug,
  normalizePublicEmail,
  normalizePublicPhone,
  validatePublicBookingContact,
};

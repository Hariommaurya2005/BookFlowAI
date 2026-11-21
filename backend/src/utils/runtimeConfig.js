const isPlaceholderSecret = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  return !normalized || /^(your|change|replace|example|secret|changeme)/.test(normalized);
};

const getProductionConfigErrors = (env = process.env) => {
  if (env.NODE_ENV !== 'production') return [];
  const errors = [];
  if (!env.MONGO_URI || !/^mongodb(\+srv)?:\/\//i.test(env.MONGO_URI)) {
    errors.push('MONGO_URI must be a valid MongoDB connection URI.');
  }
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = String(env[name] || '');
    if (value.length < 32 || isPlaceholderSecret(value)) {
      errors.push(`${name} must be a unique, non-placeholder secret with at least 32 characters.`);
    }
  }
  if (env.JWT_ACCESS_SECRET && env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
  }
  try {
    const clientUrl = new URL(env.CLIENT_URL);
    if (clientUrl.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(clientUrl.hostname)) {
      errors.push('CLIENT_URL must use HTTPS and a public hostname in production.');
    }
  } catch {
    errors.push('CLIENT_URL must be a valid HTTPS URL in production.');
  }
  return errors;
};

const assertRuntimeConfig = (env = process.env) => {
  const errors = getProductionConfigErrors(env);
  if (errors.length) throw new Error(`Unsafe production configuration:\n- ${errors.join('\n- ')}`);
  return true;
};

module.exports = { isPlaceholderSecret, getProductionConfigErrors, assertRuntimeConfig };

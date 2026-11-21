const redactSensitiveUrl = (value = '') => String(value)
  .replace(/(\/(?:reset-password|verify-email)\/)[^/?#]+/gi, '$1[redacted]')
  .replace(/([?&](?:token|accessToken|refreshToken|authorization)=)[^&#]*/gi, '$1[redacted]');

module.exports = { redactSensitiveUrl };

const TOKEN_KEYS = ['accessToken', 'refreshToken'];

export function getToken(key) {
  return sessionStorage.getItem(key) || localStorage.getItem(key);
}

export function isRememberedSession() {
  return Boolean(localStorage.getItem('accessToken'));
}

export function setTokens(tokens, remember = true) {
  clearTokens();
  const storage = remember ? localStorage : sessionStorage;
  if (tokens?.accessToken) storage.setItem('accessToken', tokens.accessToken);
  if (tokens?.refreshToken) storage.setItem('refreshToken', tokens.refreshToken);
}

export function clearTokens() {
  TOKEN_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

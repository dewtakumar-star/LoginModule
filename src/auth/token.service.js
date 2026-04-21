const jwt = require('jsonwebtoken');

const tokenBlacklist = new Map();
const refreshTokenStore = new Map();

async function invalidateToken(token) {
  let expiresAt;
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      expiresAt = decoded.exp * 1000;
    } else {
      expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    }
  } catch {
    expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  }
  tokenBlacklist.set(token, expiresAt);
  _pruneBlacklist();
}

function isTokenBlacklisted(token) {
  if (!tokenBlacklist.has(token)) return false;
  const expiresAt = tokenBlacklist.get(token);
  if (Date.now() > expiresAt) {
    tokenBlacklist.delete(token);
    return false;
  }
  return true;
}

function _pruneBlacklist() {
  const now = Date.now();
  for (const [token, expiresAt] of tokenBlacklist.entries()) {
    if (now > expiresAt) tokenBlacklist.delete(token);
  }
}

async function storeRefreshToken(userId, refreshToken) {
  refreshTokenStore.set(String(userId), refreshToken);
}

async function getRefreshToken(userId) {
  return refreshTokenStore.get(String(userId));
}

async function clearRefreshToken(userId) {
  refreshTokenStore.delete(String(userId));
}

module.exports = {
  invalidateToken,
  isTokenBlacklisted,
  storeRefreshToken,
  getRefreshToken,
  clearRefreshToken,
  _tokenBlacklist: tokenBlacklist,
  _refreshTokenStore: refreshTokenStore,
};

import axios from 'axios';

const REFRESH_ENDPOINT = '/api/auth/refresh';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

/** How many milliseconds before expiry we trigger a silent refresh (2 minutes). */
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
  /** Unix timestamp (seconds) when the access token expires */
  expiresAt: number;
}

// Internal handle for the scheduled refresh timer
let refreshTimerId: ReturnType<typeof setTimeout> | null = null;

/**
 * Persists token data to localStorage.
 */
export function storeTokens(payload: TokenPayload): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(payload.expiresAt));
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getTokenExpiry(): number | null {
  const raw = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return isNaN(parsed) ? null : parsed;
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  cancelScheduledRefresh();
}

export function cancelScheduledRefresh(): void {
  if (refreshTimerId !== null) {
    clearTimeout(refreshTimerId);
    refreshTimerId = null;
  }
}

export async function performSilentRefresh(): Promise<TokenPayload> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available – user must re-authenticate.');
  }

  const response = await axios.post<TokenPayload>(REFRESH_ENDPOINT, { refreshToken });
  const payload = response.data;
  storeTokens(payload);
  scheduleNextRefresh(payload.expiresAt);
  return payload;
}

export function scheduleNextRefresh(expiresAt: number, onError?: (err: unknown) => void): void {
  cancelScheduledRefresh();
  const nowMs = Date.now();
  const expiresAtMs = expiresAt * 1000;
  const delayMs = Math.max(0, expiresAtMs - nowMs - REFRESH_BUFFER_MS);

  refreshTimerId = setTimeout(async () => {
    try {
      await performSilentRefresh();
    } catch (err) {
      console.error('[SessionRefresh] Silent refresh failed:', err);
      clearTokens();
      onError?.(err);
    }
  }, delayMs);
}

export function initSessionRefresh(onError?: (err: unknown) => void): boolean {
  const expiresAt = getTokenExpiry();
  if (!expiresAt || !getRefreshToken()) return false;
  scheduleNextRefresh(expiresAt, onError);
  return true;
}

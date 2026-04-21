import axios from 'axios';
import {
  storeTokens, getAccessToken, getRefreshToken, getTokenExpiry,
  clearTokens, performSilentRefresh, scheduleNextRefresh,
  cancelScheduledRefresh, initSessionRefresh, TokenPayload,
} from './sessionRefresh';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const FUTURE_EXPIRY = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXPIRY   = Math.floor(Date.now() / 1000) - 60;

const mockPayload = (overrides: Partial<TokenPayload> = {}): TokenPayload => ({
  accessToken: 'access-abc', refreshToken: 'refresh-xyz', expiresAt: FUTURE_EXPIRY, ...overrides,
});

beforeEach(() => { localStorage.clear(); jest.useFakeTimers(); cancelScheduledRefresh(); jest.clearAllMocks(); });
afterEach(() => { jest.useRealTimers(); });

describe('storeTokens / getters', () => {
  it('persists all three token fields', () => {
    storeTokens(mockPayload());
    expect(getAccessToken()).toBe('access-abc');
    expect(getRefreshToken()).toBe('refresh-xyz');
    expect(getTokenExpiry()).toBe(FUTURE_EXPIRY);
  });
  it('returns null when nothing stored', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getTokenExpiry()).toBeNull();
  });
});

describe('clearTokens', () => {
  it('removes all stored values', () => {
    storeTokens(mockPayload()); clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getTokenExpiry()).toBeNull();
  });
  it('cancels any scheduled refresh', () => {
    storeTokens(mockPayload()); scheduleNextRefresh(FUTURE_EXPIRY); clearTokens();
    mockedAxios.post.mockResolvedValueOnce({ data: mockPayload() });
    jest.runAllTimers();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});

describe('performSilentRefresh', () => {
  it('calls refresh endpoint and stores new tokens', async () => {
    const newPayload = mockPayload({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    storeTokens(mockPayload());
    mockedAxios.post.mockResolvedValueOnce({ data: newPayload });
    const result = await performSilentRefresh();
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/refresh', { refreshToken: 'refresh-xyz' });
    expect(result).toEqual(newPayload);
    expect(getAccessToken()).toBe('new-access');
  });
  it('throws when no refresh token present', async () => {
    await expect(performSilentRefresh()).rejects.toThrow('No refresh token available');
  });
  it('propagates API errors', async () => {
    storeTokens(mockPayload());
    mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));
    await expect(performSilentRefresh()).rejects.toThrow('Network error');
  });
});

describe('scheduleNextRefresh', () => {
  it('fires ~2 minutes before expiry', async () => {
    storeTokens(mockPayload());
    mockedAxios.post.mockResolvedValue({ data: mockPayload({ accessToken: 'refreshed-token' }) });
    scheduleNextRefresh(FUTURE_EXPIRY);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    jest.advanceTimersByTime(3600 * 1000 - 2 * 60 * 1000 - 1);
    expect(mockedAxios.post).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2);
    await Promise.resolve();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
  it('fires immediately when within buffer window', async () => {
    const soonExpiry = Math.floor(Date.now() / 1000) + 60;
    storeTokens(mockPayload());
    mockedAxios.post.mockResolvedValue({ data: mockPayload() });
    scheduleNextRefresh(soonExpiry);
    jest.advanceTimersByTime(0); await Promise.resolve();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
  it('invokes onError and clears tokens on failure', async () => {
    storeTokens(mockPayload());
    mockedAxios.post.mockRejectedValueOnce(new Error('Unauthorized'));
    const onError = jest.fn();
    scheduleNextRefresh(PAST_EXPIRY, onError);
    jest.advanceTimersByTime(0); await Promise.resolve(); await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });
  it('cancels previous timer when called multiple times', async () => {
    storeTokens(mockPayload());
    mockedAxios.post.mockResolvedValue({ data: mockPayload() });
    scheduleNextRefresh(FUTURE_EXPIRY);
    scheduleNextRefresh(FUTURE_EXPIRY);
    jest.runAllTimers(); await Promise.resolve();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});

describe('initSessionRefresh', () => {
  it('returns false when no tokens stored', () => {
    expect(initSessionRefresh()).toBe(false);
  });
  it('returns false when expiry is missing', () => {
    localStorage.setItem('access_token', 'tok'); localStorage.setItem('refresh_token', 'ref');
    expect(initSessionRefresh()).toBe(false);
  });
  it('returns true and schedules refresh for valid session', async () => {
    storeTokens(mockPayload());
    mockedAxios.post.mockResolvedValue({ data: mockPayload({ accessToken: 'resumed' }) });
    expect(initSessionRefresh()).toBe(true);
    jest.runAllTimers(); await Promise.resolve();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
  it('calls onError when resumed refresh fails', async () => {
    storeTokens(mockPayload({ expiresAt: PAST_EXPIRY }));
    mockedAxios.post.mockRejectedValueOnce(new Error('Session gone'));
    const onError = jest.fn();
    initSessionRefresh(onError);
    jest.advanceTimersByTime(0); await Promise.resolve(); await Promise.resolve();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

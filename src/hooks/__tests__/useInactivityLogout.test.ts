import { renderHook, act } from '@testing-library/react';
import { useInactivityLogout } from '../useInactivityLogout';

describe('useInactivityLogout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('calls onLogout after the specified timeout with no activity', () => {
    const onLogout = jest.fn();
    renderHook(() =>
      useInactivityLogout({ timeoutMs: 5000, warningMs: 0, onLogout })
    );

    expect(onLogout).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onLogout before the timeout elapses', () => {
    const onLogout = jest.fn();
    renderHook(() =>
      useInactivityLogout({ timeoutMs: 5000, warningMs: 0, onLogout })
    );

    act(() => {
      jest.advanceTimersByTime(4999);
    });

    expect(onLogout).not.toHaveBeenCalled();
  });

  it('calls onWarning (warningMs) before the logout fires', () => {
    const onLogout = jest.fn();
    const onWarning = jest.fn();
    renderHook(() =>
      useInactivityLogout({
        timeoutMs: 10_000,
        warningMs: 3_000,
        onLogout,
        onWarning,
      })
    );

    act(() => { jest.advanceTimersByTime(6999); });
    expect(onWarning).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1); });
    expect(onWarning).toHaveBeenCalledTimes(1);
    expect(onWarning).toHaveBeenCalledWith(3_000);

    act(() => { jest.advanceTimersByTime(3000); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onWarning when warningMs is 0', () => {
    const onLogout = jest.fn();
    const onWarning = jest.fn();
    renderHook(() =>
      useInactivityLogout({
        timeoutMs: 5000,
        warningMs: 0,
        onLogout,
        onWarning,
      })
    );

    act(() => { jest.advanceTimersByTime(5000); });

    expect(onWarning).not.toHaveBeenCalled();
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('resets the logout timer when activity is detected', () => {
    const onLogout = jest.fn();
    renderHook(() =>
      useInactivityLogout({ timeoutMs: 5000, warningMs: 0, onLogout })
    );

    act(() => { jest.advanceTimersByTime(4000); });
    act(() => { window.dispatchEvent(new Event('mousemove')); });

    act(() => { jest.advanceTimersByTime(4000); });
    expect(onLogout).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1001); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('calls onActivity callback when user activity is detected', () => {
    const onLogout = jest.fn();
    const onActivity = jest.fn();
    renderHook(() =>
      useInactivityLogout({ timeoutMs: 5000, warningMs: 0, onLogout, onActivity })
    );

    expect(onActivity).toHaveBeenCalledTimes(1);

    act(() => { window.dispatchEvent(new Event('keydown')); });
    expect(onActivity).toHaveBeenCalledTimes(2);
  });

  it('exposes resetTimer which postpones logout when called manually', () => {
    const onLogout = jest.fn();
    const { result } = renderHook(() =>
      useInactivityLogout({ timeoutMs: 5000, warningMs: 0, onLogout })
    );

    act(() => { jest.advanceTimersByTime(4500); });
    act(() => { result.current.resetTimer(); });

    act(() => { jest.advanceTimersByTime(4500); });
    expect(onLogout).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(500); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onLogout after the hook is unmounted', () => {
    const onLogout = jest.fn();
    const { unmount } = renderHook(() =>
      useInactivityLogout({ timeoutMs: 5000, warningMs: 0, onLogout })
    );

    act(() => { jest.advanceTimersByTime(3000); });
    unmount();
    act(() => { jest.advanceTimersByTime(5000); });

    expect(onLogout).not.toHaveBeenCalled();
  });

  it('uses 15-minute default timeout when timeoutMs is not provided', () => {
    const onLogout = jest.fn();
    renderHook(() => useInactivityLogout({ onLogout }));

    act(() => { jest.advanceTimersByTime(14 * 60 * 1000 + 59_999); });
    expect(onLogout).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(1); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('resets timer for each registered activity event type', () => {
    const onLogout = jest.fn();
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

    renderHook(() =>
      useInactivityLogout({
        timeoutMs: 3000,
        warningMs: 0,
        onLogout,
        activityEvents: events,
      })
    );

    events.forEach((eventName) => {
      act(() => { jest.advanceTimersByTime(2800); });
      act(() => { window.dispatchEvent(new Event(eventName)); });
    });

    expect(onLogout).not.toHaveBeenCalled();

    act(() => { jest.advanceTimersByTime(3001); });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});

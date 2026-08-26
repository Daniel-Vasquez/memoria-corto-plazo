import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMemoryEngine, getMemorizeDurationMs } from './useMemoryEngine';

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('getMemorizeDurationMs', () => {
  it('stays within the 3-9s range and grows with text length', () => {
    expect(getMemorizeDurationMs('ab')).toBeGreaterThanOrEqual(3000);
    expect(getMemorizeDurationMs('ab')).toBeLessThan(getMemorizeDurationMs('a'.repeat(80)));
    expect(getMemorizeDurationMs('a'.repeat(200))).toBeLessThanOrEqual(9000);
  });

  it('scales with the speed preference: lento > normal > rapido', () => {
    const target = 'abcdefg';
    const lento = getMemorizeDurationMs(target, 'lento');
    const normal = getMemorizeDurationMs(target, 'normal');
    const rapido = getMemorizeDurationMs(target, 'rapido');

    expect(lento).toBeGreaterThan(normal);
    expect(normal).toBeGreaterThan(rapido);
  });

  it('defaults to the normal speed when none is given', () => {
    expect(getMemorizeDurationMs('abcdefg')).toBe(getMemorizeDurationMs('abcdefg', 'normal'));
  });
});

describe('useMemoryEngine', () => {
  it('starts idle and moves to memorizing on start()', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useMemoryEngine('ab', onFinish));

    expect(result.current.phase).toBe('idle');

    act(() => result.current.start());

    expect(result.current.phase).toBe('memorizing');
  });

  it('auto-transitions from memorizing to recalling once the memorize duration elapses', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { result } = renderHook(() => useMemoryEngine('ab', onFinish));

    act(() => result.current.start());
    expect(result.current.phase).toBe('memorizing');

    act(() => vi.advanceTimersByTime(result.current.memorizeDurationMs));
    expect(result.current.phase).toBe('recalling');
  });

  it('ignores updateTyped outside the recalling phase', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useMemoryEngine('ab', onFinish));

    act(() => result.current.updateTyped('xy'));
    expect(result.current.typed).toBe('');
  });

  it('compares the recalled text against the target on submit', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { result } = renderHook(() => useMemoryEngine('abcd', onFinish));

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(result.current.memorizeDurationMs));
    expect(result.current.phase).toBe('recalling');

    act(() => result.current.updateTyped('abxd'));
    act(() => result.current.submit());

    expect(result.current.phase).toBe('finished');
    expect(result.current.charStates).toEqual(['correct', 'correct', 'incorrect', 'correct']);
    expect(onFinish).toHaveBeenCalledTimes(1);
    const [stats, errorCount] = onFinish.mock.calls[0];
    expect(stats.accuracy).toBe(75); // 3/4 correct
    expect(errorCount).toBe(1);
  });

  it('penalizes typed text that is shorter or longer than the target', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { result } = renderHook(() => useMemoryEngine('abcd', onFinish));

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(result.current.memorizeDurationMs));
    act(() => result.current.updateTyped('abcdef')); // 2 extra chars
    act(() => result.current.submit());

    const [stats, errorCount] = onFinish.mock.calls[0];
    expect(stats.accuracy).toBe(100); // all 4 target chars matched
    expect(errorCount).toBe(2); // the 2 extra chars still count as mistakes
  });

  it('does not start on keydown when enabled is false', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useMemoryEngine('ab', onFinish, false));

    act(() => press('a'));

    expect(result.current.phase).toBe('idle');
  });

  it('starts memorizing on any keydown while idle and enabled', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useMemoryEngine('ab', onFinish));

    act(() => press('a'));

    expect(result.current.phase).toBe('memorizing');
  });

  it('resets phase/typed when the target text changes', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { result, rerender } = renderHook(({ target }) => useMemoryEngine(target, onFinish), {
      initialProps: { target: 'ab' },
    });

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(result.current.memorizeDurationMs));
    act(() => result.current.updateTyped('ab'));

    rerender({ target: 'cd' });

    expect(result.current.phase).toBe('idle');
    expect(result.current.typed).toBe('');
  });

  it('resets phase/typed and applies the new duration when the speed preference changes', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { result, rerender } = renderHook(
      ({ speed }: { speed: 'lento' | 'normal' | 'rapido' }) =>
        useMemoryEngine('abcdefg', onFinish, true, speed),
      { initialProps: { speed: 'normal' } },
    );

    const normalDuration = result.current.memorizeDurationMs;
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(normalDuration));
    act(() => result.current.updateTyped('ab'));
    expect(result.current.phase).toBe('recalling');

    rerender({ speed: 'lento' });

    expect(result.current.phase).toBe('idle');
    expect(result.current.typed).toBe('');
    expect(result.current.memorizeDurationMs).toBeGreaterThan(normalDuration);
  });
});

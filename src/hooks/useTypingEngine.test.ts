import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTypingEngine } from './useTypingEngine';

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useTypingEngine', () => {
  it('starts idle and switches to running on the first keystroke', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useTypingEngine('ab', onFinish));

    expect(result.current.status).toBe('idle');

    act(() => press('a'));

    expect(result.current.status).toBe('running');
    expect(result.current.typed).toBe('a');
  });

  it('marks each character as correct or incorrect as it is typed', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useTypingEngine('ab', onFinish));

    act(() => press('a'));
    act(() => press('x')); // target[1] is 'b'

    expect(result.current.charStates).toEqual(['correct', 'incorrect']);
  });

  it('does not count backspace as a keystroke, but keeps the earlier mistake counted', () => {
    const onFinish = vi.fn();
    renderHook(() => useTypingEngine('ab', onFinish));

    act(() => press('a')); // correct: 1/1
    act(() => press('x')); // wrong at index 1: 1/2
    act(() => press('Backspace')); // removes 'x', does not touch the counters
    act(() => press('b')); // correct at index 1: 2/3 -> finishes

    expect(onFinish).toHaveBeenCalledTimes(1);
    const [stats, errorCount] = onFinish.mock.calls[0];
    expect(stats.accuracy).toBe(67); // round(2/3 * 100)
    expect(errorCount).toBe(1);
  });

  it('calls onFinish once the target length is reached and ignores further input', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useTypingEngine('ab', onFinish));

    act(() => press('a'));
    act(() => press('b'));

    expect(result.current.status).toBe('finished');
    expect(onFinish).toHaveBeenCalledTimes(1);
    const [stats, errorCount] = onFinish.mock.calls[0];
    expect(stats.accuracy).toBe(100);
    expect(errorCount).toBe(0);

    act(() => press('c'));
    expect(result.current.typed).toBe('ab'); // extra input after finishing is a no-op
  });

  it('does not attach the keydown listener when enabled is false', () => {
    const onFinish = vi.fn();
    const { result } = renderHook(() => useTypingEngine('ab', onFinish, false));

    act(() => press('a'));

    expect(result.current.typed).toBe('');
    expect(result.current.status).toBe('idle');
  });

  it('resets typed/status/stats when the target text changes', () => {
    const onFinish = vi.fn();
    const { result, rerender } = renderHook(({ target }) => useTypingEngine(target, onFinish), {
      initialProps: { target: 'ab' },
    });

    act(() => press('a'));
    expect(result.current.typed).toBe('a');

    rerender({ target: 'cd' });

    expect(result.current.typed).toBe('');
    expect(result.current.status).toBe('idle');
  });

  it('keeps the live WPM at 0 until a second has really elapsed (regression test)', () => {
    vi.useFakeTimers();
    const onFinish = vi.fn();
    const { result } = renderHook(() => useTypingEngine('abcdefghij', onFinish));

    act(() => press('a'));
    // A tiny amount of elapsed time with a nonzero word count used to spike
    // WPM into the thousands (words / near-zero minutes).
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current.stats.wpm).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.stats.wpm).toBeGreaterThan(0);
  });
});

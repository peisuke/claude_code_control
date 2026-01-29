import { renderHook } from '@testing-library/react';
import { useChoiceDetection } from '../tmux/useChoiceDetection';

describe('useChoiceDetection', () => {
  it('returns empty array for empty output', () => {
    const { result } = renderHook(() => useChoiceDetection(''));
    expect(result.current).toEqual([]);
  });

  it('detects yes/no choices as buttons', () => {
    const output = 'Some prompt text\n1. Yes\n2. No';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([
      { number: 1, text: 'Yes' },
      { number: 2, text: 'No' }
    ]);
  });

  it('returns empty for non-yes/no choices (general text)', () => {
    const output = 'Pick one:\n1. Option A\n2. Option B\n3. Option C';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([]);
  });

  it('returns empty for single choice (needs 2+)', () => {
    const output = '1. Only option';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([]);
  });

  it('returns empty for non-sequential numbers', () => {
    const output = '2. Skipped\n3. Also skipped';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([]);
  });

  it('returns empty for no matching patterns', () => {
    const output = 'Just some regular output\nNo choices here';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([]);
  });

  it('only looks at tail lines', () => {
    const lines = Array.from({ length: 30 }, (_, i) => `line ${i}`);
    lines.push('1. Yes', '2. No');
    const output = lines.join('\n');
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([
      { number: 1, text: 'Yes' },
      { number: 2, text: 'No' }
    ]);
  });

  it('strips ANSI escape sequences from choice text', () => {
    const output = 'Pick:\n\x1b[32m1. Yes\x1b[0m\n\x1b[32m2. No\x1b[0m';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([
      { number: 1, text: 'Yes' },
      { number: 2, text: 'No' }
    ]);
  });

  it('handles choices with extra whitespace', () => {
    const output = '  1. Yes  \n  2. No  ';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([
      { number: 1, text: 'Yes' },
      { number: 2, text: 'No' }
    ]);
  });

  it('returns empty for non-yes/no words like ok/cancel', () => {
    const output = '1. OK\n2. Cancel';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([]);
  });
});

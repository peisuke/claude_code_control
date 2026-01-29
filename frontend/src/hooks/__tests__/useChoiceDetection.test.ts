import { renderHook } from '@testing-library/react';
import { useChoiceDetection } from '../tmux/useChoiceDetection';

describe('useChoiceDetection', () => {
  it('returns empty array for empty output', () => {
    const { result } = renderHook(() => useChoiceDetection(''));
    expect(result.current).toEqual([]);
  });

  it('detects numbered choices', () => {
    const output = 'Some prompt text\n1. Yes\n2. No';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([
      { number: 1, text: 'Yes' },
      { number: 2, text: 'No' }
    ]);
  });

  it('detects three choices', () => {
    const output = 'Pick one:\n1. Option A\n2. Option B\n3. Option C';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toHaveLength(3);
    expect(result.current[2]).toEqual({ number: 3, text: 'Option C' });
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

  it('handles choices with extra whitespace', () => {
    const output = '  1. Yes  \n  2. No  ';
    const { result } = renderHook(() => useChoiceDetection(output));
    expect(result.current).toEqual([
      { number: 1, text: 'Yes' },
      { number: 2, text: 'No' }
    ]);
  });
});

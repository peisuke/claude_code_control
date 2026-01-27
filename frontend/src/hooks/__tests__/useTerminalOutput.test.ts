import { renderHook, act } from '@testing-library/react';
import { useTerminalOutput } from '../useTerminalOutput';
import { ScrollUtils } from '../../utils/scroll';

jest.mock('../../utils/scroll');

const mockScrollToBottom = ScrollUtils.scrollToBottom as jest.MockedFunction<typeof ScrollUtils.scrollToBottom>;

describe('useTerminalOutput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty output initially', () => {
      const { result } = renderHook(() => useTerminalOutput());
      expect(result.current.output).toBe('');
    });

    it('should have outputRef defined', () => {
      const { result } = renderHook(() => useTerminalOutput());
      expect(result.current.outputRef).toBeDefined();
      expect(result.current.outputRef.current).toBeNull();
    });
  });

  describe('setOutput', () => {
    it('should update output state', () => {
      const { result } = renderHook(() => useTerminalOutput());

      act(() => {
        result.current.setOutput('new output');
      });

      expect(result.current.output).toBe('new output');
    });

    it('should handle multi-line output', () => {
      const { result } = renderHook(() => useTerminalOutput());

      const multiLineOutput = 'line1\nline2\nline3';
      act(() => {
        result.current.setOutput(multiLineOutput);
      });

      expect(result.current.output).toBe(multiLineOutput);
    });
  });

  describe('scrollToBottom', () => {
    it('should call ScrollUtils.scrollToBottom', () => {
      const { result } = renderHook(() => useTerminalOutput());

      act(() => {
        result.current.scrollToBottom();
      });

      expect(mockScrollToBottom).toHaveBeenCalledWith(null);
    });

    it('should return stable function reference', () => {
      const { result, rerender } = renderHook(() => useTerminalOutput());

      const scrollToBottom1 = result.current.scrollToBottom;
      rerender();
      const scrollToBottom2 = result.current.scrollToBottom;

      expect(scrollToBottom1).toBe(scrollToBottom2);
    });
  });
});

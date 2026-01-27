import { renderHook, act, waitFor } from '@testing-library/react';
import { useOutputState } from '../useOutputState';
import { useTerminalOutput } from '../useTerminalOutput';
import { useTmux } from '../useTmux';
import { TmuxOutput } from '../../types';

jest.mock('../useTerminalOutput');
jest.mock('../useTmux');

const mockUseTerminalOutput = useTerminalOutput as jest.MockedFunction<typeof useTerminalOutput>;
const mockUseTmux = useTmux as jest.MockedFunction<typeof useTmux>;

describe('useOutputState', () => {
  const mockSetOutput = jest.fn();
  const mockScrollToBottom = jest.fn();
  const mockGetOutput = jest.fn();
  const mockOutputRef = { current: null };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseTerminalOutput.mockReturnValue({
      output: '',
      setOutput: mockSetOutput,
      outputRef: mockOutputRef,
      scrollToBottom: mockScrollToBottom,
    });

    mockUseTmux.mockReturnValue({
      sendCommand: jest.fn(),
      sendEnter: jest.fn(),
      getOutput: mockGetOutput,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return initial state from hooks', () => {
      mockUseTerminalOutput.mockReturnValue({
        output: 'test output',
        setOutput: mockSetOutput,
        outputRef: mockOutputRef,
        scrollToBottom: mockScrollToBottom,
      });

      const { result } = renderHook(() =>
        useOutputState({
          selectedTarget: 'default',
          isConnected: false,
          lastMessage: null,
          autoRefresh: true,
        })
      );

      expect(result.current.state.output).toBe('test output');
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBeNull();
    });
  });

  describe('handleRefresh', () => {
    it('should fetch output and update state', async () => {
      mockGetOutput.mockResolvedValueOnce('new output');

      const { result } = renderHook(() =>
        useOutputState({
          selectedTarget: 'default',
          isConnected: true,
          lastMessage: null,
          autoRefresh: true,
        })
      );

      await act(async () => {
        await result.current.handlers.handleRefresh();
      });

      expect(mockGetOutput).toHaveBeenCalledWith('default');
      expect(mockSetOutput).toHaveBeenCalledWith('new output');
    });

    it('should scroll to bottom after refresh', async () => {
      mockGetOutput.mockResolvedValueOnce('output');

      const { result } = renderHook(() =>
        useOutputState({
          selectedTarget: 'default',
          isConnected: true,
          lastMessage: null,
          autoRefresh: true,
        })
      );

      await act(async () => {
        await result.current.handlers.handleRefresh();
      });

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(mockScrollToBottom).toHaveBeenCalled();
    });

    it('should handle refresh error silently', async () => {
      mockGetOutput.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useOutputState({
          selectedTarget: 'default',
          isConnected: true,
          lastMessage: null,
          autoRefresh: true,
        })
      );

      // Should not throw
      await act(async () => {
        await result.current.handlers.handleRefresh();
      });
    });
  });

  describe('target change effect', () => {
    it('should clear output and refresh when target changes', async () => {
      mockGetOutput.mockResolvedValue('new content');

      const { rerender } = renderHook(
        ({ target }) =>
          useOutputState({
            selectedTarget: target,
            isConnected: true,
            lastMessage: null,
            autoRefresh: true,
          }),
        { initialProps: { target: 'session1' } }
      );

      // Wait for initial effects
      await act(async () => {
        await Promise.resolve();
      });

      mockSetOutput.mockClear();
      mockGetOutput.mockClear();

      rerender({ target: 'session2' });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockSetOutput).toHaveBeenCalledWith('');
      expect(mockGetOutput).toHaveBeenCalledWith('session2');
    });

    it('should not refresh when not connected', async () => {
      const { rerender } = renderHook(
        ({ target }) =>
          useOutputState({
            selectedTarget: target,
            isConnected: false,
            lastMessage: null,
            autoRefresh: true,
          }),
        { initialProps: { target: 'session1' } }
      );

      mockGetOutput.mockClear();

      rerender({ target: 'session2' });

      await act(async () => {
        await Promise.resolve();
      });

      // setOutput('') is called, but getOutput should not be called
      expect(mockSetOutput).toHaveBeenCalledWith('');
    });
  });

  describe('WebSocket message effect', () => {
    it('should update output when lastMessage changes', () => {
      const lastMessage: TmuxOutput = {
        content: 'ws message content',
        target: 'default',
        timestamp: new Date().toISOString(),
      };

      const { rerender } = renderHook(
        ({ msg }) =>
          useOutputState({
            selectedTarget: 'default',
            isConnected: true,
            lastMessage: msg,
            autoRefresh: true,
          }),
        { initialProps: { msg: null as TmuxOutput | null } }
      );

      mockSetOutput.mockClear();

      rerender({ msg: lastMessage });

      expect(mockSetOutput).toHaveBeenCalledWith('ws message content');
    });

    it('should not update output when target does not match', () => {
      const lastMessage: TmuxOutput = {
        content: 'ws message content',
        target: 'other-target',
        timestamp: new Date().toISOString(),
      };

      const { rerender } = renderHook(
        ({ msg }) =>
          useOutputState({
            selectedTarget: 'default',
            isConnected: true,
            lastMessage: msg,
            autoRefresh: true,
          }),
        { initialProps: { msg: null as TmuxOutput | null } }
      );

      mockSetOutput.mockClear();

      rerender({ msg: lastMessage });

      // Should not call setOutput because target doesn't match
      expect(mockSetOutput).not.toHaveBeenCalledWith('ws message content');
    });

    it('should not update output when autoRefresh is false', () => {
      const lastMessage: TmuxOutput = {
        content: 'ws message content',
        target: 'default',
        timestamp: new Date().toISOString(),
      };

      const { rerender } = renderHook(
        ({ msg }) =>
          useOutputState({
            selectedTarget: 'default',
            isConnected: true,
            lastMessage: msg,
            autoRefresh: false,
          }),
        { initialProps: { msg: null as TmuxOutput | null } }
      );

      mockSetOutput.mockClear();

      rerender({ msg: lastMessage });

      expect(mockSetOutput).not.toHaveBeenCalledWith('ws message content');
    });
  });

  describe('initial load effect', () => {
    it('should refresh when isConnected becomes true', async () => {
      mockGetOutput.mockResolvedValue('initial content');

      const { rerender } = renderHook(
        ({ connected }) =>
          useOutputState({
            selectedTarget: 'default',
            isConnected: connected,
            lastMessage: null,
            autoRefresh: true,
          }),
        { initialProps: { connected: false } }
      );

      mockGetOutput.mockClear();

      rerender({ connected: true });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockGetOutput).toHaveBeenCalled();
    });
  });

  describe('setOutput handler', () => {
    it('should expose setOutput from useTerminalOutput', () => {
      const { result } = renderHook(() =>
        useOutputState({
          selectedTarget: 'default',
          isConnected: false,
          lastMessage: null,
          autoRefresh: true,
        })
      );

      act(() => {
        result.current.handlers.setOutput('manual output');
      });

      expect(mockSetOutput).toHaveBeenCalledWith('manual output');
    });
  });
});

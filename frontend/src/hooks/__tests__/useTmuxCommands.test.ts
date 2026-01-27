import { renderHook, act } from '@testing-library/react';
import { useTmuxCommands } from '../useTmuxCommands';
import { useTmux } from '../useTmux';

jest.mock('../useTmux');

const mockUseTmux = useTmux as jest.MockedFunction<typeof useTmux>;

describe('useTmuxCommands', () => {
  const mockSendCommand = jest.fn();
  const mockSendEnter = jest.fn();
  const mockGetOutput = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTmux.mockReturnValue({
      sendCommand: mockSendCommand,
      sendEnter: mockSendEnter,
      getOutput: mockGetOutput,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('sendCommand', () => {
    it('should not send empty command', async () => {
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendCommand('', 'default');
      });

      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it('should not send whitespace-only command', async () => {
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendCommand('   ', 'default');
      });

      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it('should send sanitized command', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendCommand('  ls -la  ', 'default');
      });

      expect(mockSendCommand).toHaveBeenCalledWith('ls -la', 'default');
    });

    it('should call onRefresh after delay', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendCommand('ls', 'default');
      });

      expect(mockOnRefresh).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not call onRefresh if not provided', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTmuxCommands());

      await act(async () => {
        await result.current.sendCommand('ls', 'default');
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // No error should occur
    });
  });

  describe('sendEnter', () => {
    it('should call tmux.sendEnter with target', async () => {
      mockSendEnter.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendEnter('my-session');
      });

      expect(mockSendEnter).toHaveBeenCalledWith('my-session');
    });

    it('should call onRefresh after delay', async () => {
      mockSendEnter.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendEnter('default');
      });

      expect(mockOnRefresh).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendKeyboardCommand', () => {
    it('should call tmux.sendCommand with key command', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendKeyboardCommand('C-c', 'default');
      });

      expect(mockSendCommand).toHaveBeenCalledWith('C-c', 'default');
    });

    it('should call onRefresh after shorter delay', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);
      const { result } = renderHook(() => useTmuxCommands({ onRefresh: mockOnRefresh }));

      await act(async () => {
        await result.current.sendKeyboardCommand('C-c', 'default');
      });

      expect(mockOnRefresh).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

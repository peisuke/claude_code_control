import { renderHook, act } from '@testing-library/react';
import { useCommandState } from '../useCommandState';
import { useTmux } from '../useTmux';

jest.mock('../useTmux');

const mockUseTmux = useTmux as jest.MockedFunction<typeof useTmux>;

describe('useCommandState', () => {
  const mockSendCommand = jest.fn();
  const mockSendEnter = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseTmux.mockReturnValue({
      sendCommand: mockSendCommand,
      sendEnter: mockSendEnter,
      getOutput: jest.fn(),
      isLoading: false,
      error: null,
      output: '',
      setOutput: jest.fn(),
      outputRef: { current: null },
      scrollToBottom: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should have empty command initially', () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      expect(result.current.state.command).toBe('');
    });

    it('should have commandExpanded as false initially', () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      expect(result.current.state.commandExpanded).toBe(false);
    });
  });

  describe('setCommand', () => {
    it('should update command state', () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommand('ls -la');
      });

      expect(result.current.state.command).toBe('ls -la');
    });

    it('should allow setting command to empty string', () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommand('some command');
      });

      expect(result.current.state.command).toBe('some command');

      act(() => {
        result.current.handlers.setCommand('');
      });

      expect(result.current.state.command).toBe('');
    });
  });

  describe('setCommandExpanded', () => {
    it('should update commandExpanded state to true', () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommandExpanded(true);
      });

      expect(result.current.state.commandExpanded).toBe(true);
    });

    it('should toggle commandExpanded state', () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommandExpanded(true);
      });
      expect(result.current.state.commandExpanded).toBe(true);

      act(() => {
        result.current.handlers.setCommandExpanded(false);
      });
      expect(result.current.state.commandExpanded).toBe(false);
    });
  });

  describe('handleSendCommand', () => {
    it('should call sendCommand with sanitized command and target', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'my-session',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommand('echo hello');
      });

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      expect(mockSendCommand).toHaveBeenCalledWith('echo hello', 'my-session');
    });

    it('should clear command after successful send', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommand('ls');
      });

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      expect(result.current.state.command).toBe('');
    });

    it('should not call sendCommand for empty command', async () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it('should not call sendCommand for whitespace-only command', async () => {
      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommand('   ');
      });

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      expect(mockSendCommand).not.toHaveBeenCalled();
    });

    it('should handle error silently and not clear command', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Send failed'));

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommand('error command');
      });

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      // Command should not be cleared on error
      expect(result.current.state.command).toBe('error command');
    });

    it('should schedule refresh after successful send', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      act(() => {
        result.current.handlers.setCommand('ls');
      });

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      act(() => {
        jest.runAllTimers();
      });

      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('handleSendEnter', () => {
    it('should call sendEnter with target', async () => {
      mockSendEnter.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'my-session:0',
          onRefresh: mockOnRefresh,
        })
      );

      await act(async () => {
        await result.current.handlers.handleSendEnter();
      });

      expect(mockSendEnter).toHaveBeenCalledWith('my-session:0');
    });

    it('should handle error silently', async () => {
      mockSendEnter.mockRejectedValueOnce(new Error('Enter failed'));

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      // Should not throw
      await act(async () => {
        await result.current.handlers.handleSendEnter();
      });

      expect(mockSendEnter).toHaveBeenCalled();
    });
  });

  describe('handleKeyboardCommand', () => {
    it('should call sendCommand with key command and target', async () => {
      mockSendCommand.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'session:1',
          onRefresh: mockOnRefresh,
        })
      );

      await act(async () => {
        await result.current.handlers.handleKeyboardCommand('C-c');
      });

      expect(mockSendCommand).toHaveBeenCalledWith('C-c', 'session:1');
    });

    it('should handle various keyboard commands', async () => {
      mockSendCommand.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      const commands = ['C-c', 'C-z', 'C-l', 'C-d', 'Escape'];

      for (const cmd of commands) {
        await act(async () => {
          await result.current.handlers.handleKeyboardCommand(cmd);
        });
      }

      expect(mockSendCommand).toHaveBeenCalledTimes(commands.length);
    });

    it('should handle error silently', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('Keyboard command failed'));

      const { result } = renderHook(() =>
        useCommandState({
          selectedTarget: 'default',
          onRefresh: mockOnRefresh,
        })
      );

      // Should not throw
      await act(async () => {
        await result.current.handlers.handleKeyboardCommand('C-c');
      });

      expect(mockSendCommand).toHaveBeenCalled();
    });
  });

  describe('target changes', () => {
    it('should use updated target when sending command', async () => {
      mockSendCommand.mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ target }) =>
          useCommandState({
            selectedTarget: target,
            onRefresh: mockOnRefresh,
          }),
        { initialProps: { target: 'session1' } }
      );

      act(() => {
        result.current.handlers.setCommand('test');
      });

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      expect(mockSendCommand).toHaveBeenCalledWith('test', 'session1');

      // Change target
      rerender({ target: 'session2' });

      act(() => {
        result.current.handlers.setCommand('test2');
      });

      await act(async () => {
        await result.current.handlers.handleSendCommand();
      });

      expect(mockSendCommand).toHaveBeenLastCalledWith('test2', 'session2');
    });
  });
});

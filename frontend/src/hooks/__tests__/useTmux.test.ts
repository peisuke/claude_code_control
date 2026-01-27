import { renderHook, act, waitFor } from '@testing-library/react';
import { useTmux } from '../useTmux';
import { tmuxAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  tmuxAPI: {
    sendCommand: jest.fn(),
    sendEnter: jest.fn(),
    getOutput: jest.fn(),
  },
}));

const mockTmuxAPI = tmuxAPI as jest.Mocked<typeof tmuxAPI>;

describe('useTmux', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have isLoading as false initially', () => {
      const { result } = renderHook(() => useTmux());
      expect(result.current.isLoading).toBe(false);
    });

    it('should have error as null initially', () => {
      const { result } = renderHook(() => useTmux());
      expect(result.current.error).toBeNull();
    });
  });

  describe('sendCommand', () => {
    it('should call tmuxAPI.sendCommand with command and target', async () => {
      mockTmuxAPI.sendCommand.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        await result.current.sendCommand('ls -la', 'my-session');
      });

      expect(mockTmuxAPI.sendCommand).toHaveBeenCalledWith('ls -la', 'my-session');
    });

    it('should call tmuxAPI.sendCommand without target', async () => {
      mockTmuxAPI.sendCommand.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        await result.current.sendCommand('echo hello');
      });

      expect(mockTmuxAPI.sendCommand).toHaveBeenCalledWith('echo hello', undefined);
    });

    it('should set isLoading to true during request', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTmuxAPI.sendCommand.mockReturnValueOnce(promise as Promise<any>);

      const { result } = renderHook(() => useTmux());

      act(() => {
        result.current.sendCommand('ls');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      const errorMessage = 'Network error';
      mockTmuxAPI.sendCommand.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        try {
          await result.current.sendCommand('ls');
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
    });

    it('should throw error on failure', async () => {
      const error = new Error('Command failed');
      mockTmuxAPI.sendCommand.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useTmux());

      await expect(
        act(async () => {
          await result.current.sendCommand('ls');
        })
      ).rejects.toThrow('Command failed');
    });

    it('should clear error on new request', async () => {
      mockTmuxAPI.sendCommand.mockRejectedValueOnce(new Error('First error'));
      mockTmuxAPI.sendCommand.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTmux());

      // First call - should error
      await act(async () => {
        try {
          await result.current.sendCommand('ls');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('First error');

      // Second call - should clear error
      await act(async () => {
        await result.current.sendCommand('ls');
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle non-Error objects as errors', async () => {
      mockTmuxAPI.sendCommand.mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        try {
          await result.current.sendCommand('ls');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Failed to send command');
    });
  });

  describe('sendEnter', () => {
    it('should call tmuxAPI.sendEnter with target', async () => {
      mockTmuxAPI.sendEnter.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        await result.current.sendEnter('my-session');
      });

      expect(mockTmuxAPI.sendEnter).toHaveBeenCalledWith('my-session');
    });

    it('should call tmuxAPI.sendEnter without target', async () => {
      mockTmuxAPI.sendEnter.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        await result.current.sendEnter();
      });

      expect(mockTmuxAPI.sendEnter).toHaveBeenCalledWith(undefined);
    });

    it('should set isLoading to true during request', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTmuxAPI.sendEnter.mockReturnValueOnce(promise as Promise<any>);

      const { result } = renderHook(() => useTmux());

      act(() => {
        result.current.sendEnter();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockTmuxAPI.sendEnter.mockRejectedValueOnce(new Error('Enter failed'));

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        try {
          await result.current.sendEnter();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Enter failed');
    });

    it('should handle non-Error objects as errors', async () => {
      mockTmuxAPI.sendEnter.mockRejectedValueOnce({ message: 'object error' });

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        try {
          await result.current.sendEnter();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Failed to send enter');
    });
  });

  describe('getOutput', () => {
    it('should call tmuxAPI.getOutput and return content', async () => {
      const mockOutput = { content: 'terminal output', timestamp: Date.now() };
      mockTmuxAPI.getOutput.mockResolvedValueOnce(mockOutput as any);

      const { result } = renderHook(() => useTmux());

      let output: string;
      await act(async () => {
        output = await result.current.getOutput('my-session');
      });

      expect(output!).toBe('terminal output');
      expect(mockTmuxAPI.getOutput).toHaveBeenCalledWith('my-session', false, undefined);
    });

    it('should call tmuxAPI.getOutput without target', async () => {
      const mockOutput = { content: 'output', timestamp: Date.now() };
      mockTmuxAPI.getOutput.mockResolvedValueOnce(mockOutput as any);

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        await result.current.getOutput();
      });

      expect(mockTmuxAPI.getOutput).toHaveBeenCalledWith(undefined, false, undefined);
    });

    it('should set isLoading to true during request', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTmuxAPI.getOutput.mockReturnValueOnce(promise as Promise<any>);

      const { result } = renderHook(() => useTmux());

      act(() => {
        result.current.getOutput();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({ content: 'output' });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockTmuxAPI.getOutput.mockRejectedValueOnce(new Error('Output failed'));

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        try {
          await result.current.getOutput();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Output failed');
    });

    it('should throw error on failure', async () => {
      mockTmuxAPI.getOutput.mockRejectedValueOnce(new Error('Get output error'));

      const { result } = renderHook(() => useTmux());

      await expect(
        act(async () => {
          await result.current.getOutput();
        })
      ).rejects.toThrow('Get output error');
    });

    it('should handle non-Error objects as errors', async () => {
      mockTmuxAPI.getOutput.mockRejectedValueOnce(null);

      const { result } = renderHook(() => useTmux());

      await act(async () => {
        try {
          await result.current.getOutput();
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBe('Failed to get output');
    });
  });

  describe('function stability', () => {
    it('should return stable function references', () => {
      const { result, rerender } = renderHook(() => useTmux());

      const { sendCommand: sendCommand1, sendEnter: sendEnter1, getOutput: getOutput1 } = result.current;

      rerender();

      const { sendCommand: sendCommand2, sendEnter: sendEnter2, getOutput: getOutput2 } = result.current;

      expect(sendCommand1).toBe(sendCommand2);
      expect(sendEnter1).toBe(sendEnter2);
      expect(getOutput1).toBe(getOutput2);
    });
  });
});

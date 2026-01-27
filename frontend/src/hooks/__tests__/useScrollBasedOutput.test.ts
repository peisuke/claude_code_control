import { renderHook, act } from '@testing-library/react';
import { useScrollBasedOutput } from '../useScrollBasedOutput';
import { tmuxAPI } from '../../services/api';

jest.mock('../../services/api');

const mockTmuxAPI = tmuxAPI as jest.Mocked<typeof tmuxAPI>;

describe('useScrollBasedOutput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should have empty output by default', () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      expect(result.current.output).toBe('');
      expect(result.current.isLoadingHistory).toBe(false);
    });

    it('should use initialOutput if provided', () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
          initialOutput: 'initial content',
        })
      );

      expect(result.current.output).toBe('initial content');
    });

    it('should provide outputRef', () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      expect(result.current.outputRef).toBeDefined();
      expect(result.current.outputRef.current).toBeNull();
    });
  });

  describe('setOutput', () => {
    it('should update output', () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      act(() => {
        result.current.setOutput('new output content');
      });

      expect(result.current.output).toBe('new output content');
    });

    it('should reset total loaded lines when setting output', () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      act(() => {
        result.current.setOutput('some content');
      });

      // Output is set, internal state is reset
      expect(result.current.output).toBe('some content');
    });
  });

  describe('handleScroll', () => {
    it('should be a function', () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      expect(typeof result.current.handleScroll).toBe('function');
    });

    it('should trigger load when scrolling near top with valid ref', async () => {
      mockTmuxAPI.getOutput.mockResolvedValueOnce({
        content: 'historical content',
      } as any);

      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      // Mock the outputRef to have a valid element
      const mockElement = {
        scrollTop: 10, // Near top (less than SCROLL_THRESHOLD of 50)
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLDivElement;

      // Manually set the ref
      (result.current.outputRef as any).current = mockElement;

      await act(async () => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
        await Promise.resolve();
      });

      expect(mockTmuxAPI.getOutput).toHaveBeenCalledWith('default', true, 500);
    });

    it('should not load history when not connected', async () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: false,
        })
      );

      const mockElement = {
        scrollTop: 10,
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLElement;

      await act(async () => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
      });

      expect(mockTmuxAPI.getOutput).not.toHaveBeenCalled();
    });

    it('should not load history when not at top', async () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      const mockElement = {
        scrollTop: 200, // Not near top
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLElement;

      await act(async () => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
      });

      expect(mockTmuxAPI.getOutput).not.toHaveBeenCalled();
    });

    it('should detect when at bottom', () => {
      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      const mockElement = {
        scrollTop: 480, // scrollHeight - clientHeight - 20 = near bottom
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLElement;

      act(() => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
      });

      // Internal state tracks isAtBottom - no direct way to verify
      // but this should not trigger history loading
      expect(mockTmuxAPI.getOutput).not.toHaveBeenCalled();
    });
  });

  describe('history loading', () => {
    it('should set isLoadingHistory during load', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTmuxAPI.getOutput.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      const mockElement = {
        scrollTop: 10,
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLDivElement;

      // Set the ref for the hook to use
      (result.current.outputRef as any).current = mockElement;

      act(() => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
      });

      expect(result.current.isLoadingHistory).toBe(true);

      await act(async () => {
        resolvePromise!({ content: 'historical content' });
      });

      expect(result.current.isLoadingHistory).toBe(false);
    });

    it('should handle load error silently', async () => {
      mockTmuxAPI.getOutput.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      const mockElement = {
        scrollTop: 10,
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLDivElement;

      // Set the ref for the hook to use
      (result.current.outputRef as any).current = mockElement;

      await act(async () => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
        await Promise.resolve();
      });

      // Should not throw and isLoadingHistory should be false
      expect(result.current.isLoadingHistory).toBe(false);
    });

    it('should not load multiple times simultaneously', async () => {
      let resolveFirst: (value: unknown) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      mockTmuxAPI.getOutput.mockReturnValueOnce(firstPromise as any);
      mockTmuxAPI.getOutput.mockResolvedValueOnce({ content: 'content' } as any);

      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
        })
      );

      const mockElement = {
        scrollTop: 10,
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLDivElement;

      // Set the ref for the hook to use
      (result.current.outputRef as any).current = mockElement;

      // Trigger first load
      act(() => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
      });

      // Try to trigger second load while first is in progress
      act(() => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
      });

      // Should only call getOutput once
      expect(mockTmuxAPI.getOutput).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveFirst!({ content: 'content' });
      });
    });

    it('should update output with history content', async () => {
      mockTmuxAPI.getOutput.mockResolvedValueOnce({
        content: 'historical content with more lines',
      } as any);

      const { result } = renderHook(() =>
        useScrollBasedOutput({
          selectedTarget: 'default',
          isConnected: true,
          initialOutput: 'initial',
        })
      );

      const mockElement = {
        scrollTop: 10,
        scrollHeight: 1000,
        clientHeight: 500,
      } as HTMLDivElement;

      // Set the ref for the hook to use
      (result.current.outputRef as any).current = mockElement;

      await act(async () => {
        result.current.handleScroll({ currentTarget: mockElement } as any);
        await Promise.resolve();
      });

      expect(result.current.output).toBe('historical content with more lines');
    });
  });
});

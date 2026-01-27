import { renderHook } from '@testing-library/react';
import { useConnectionState } from '../useConnectionState';
import { useWebSocket } from '../useWebSocket';
import { useAppVisibility } from '../useAppVisibility';

jest.mock('../useWebSocket');
jest.mock('../useAppVisibility');

const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;
const mockUseAppVisibility = useAppVisibility as jest.MockedFunction<typeof useAppVisibility>;

describe('useConnectionState', () => {
  const mockConnect = jest.fn();
  const mockDisconnect = jest.fn();
  const mockSetTarget = jest.fn();
  const mockResetAndReconnect = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseWebSocket.mockReturnValue({
      lastMessage: null,
      isConnected: true,
      isReconnecting: false,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      connect: mockConnect,
      disconnect: mockDisconnect,
      setTarget: mockSetTarget,
      resetAndReconnect: mockResetAndReconnect,
      error: null,
    });

    mockUseAppVisibility.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should return WebSocket state', () => {
      const { result } = renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: true,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      expect(result.current.state.wsConnected).toBe(true);
      expect(result.current.state.isReconnecting).toBe(false);
      expect(result.current.state.reconnectAttempts).toBe(0);
      expect(result.current.state.maxReconnectAttempts).toBe(5);
      expect(result.current.state.wsError).toBeNull();
    });

    it('should return handlers', () => {
      const { result } = renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: true,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      expect(result.current.handlers.wsConnect).toBe(mockConnect);
      expect(result.current.handlers.wsDisconnect).toBe(mockDisconnect);
      expect(result.current.handlers.wsSetTarget).toBe(mockSetTarget);
      expect(result.current.handlers.wsResetAndReconnect).toBe(mockResetAndReconnect);
    });

    it('should return lastMessage', () => {
      const lastMessage = {
        content: 'test content',
        target: 'default',
        timestamp: new Date().toISOString(),
      };

      mockUseWebSocket.mockReturnValue({
        lastMessage,
        isConnected: true,
        isReconnecting: false,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        connect: mockConnect,
        disconnect: mockDisconnect,
        setTarget: mockSetTarget,
        resetAndReconnect: mockResetAndReconnect,
        error: null,
      });

      const { result } = renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: true,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      expect(result.current.lastMessage).toBe(lastMessage);
    });
  });

  describe('useWebSocket initialization', () => {
    it('should call useWebSocket with selectedTarget', () => {
      renderHook(() =>
        useConnectionState({
          selectedTarget: 'my-session',
          isConnected: true,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      expect(mockUseWebSocket).toHaveBeenCalledWith('my-session');
    });
  });

  describe('useAppVisibility integration', () => {
    it('should call useAppVisibility with enabled true', () => {
      renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: true,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      expect(mockUseAppVisibility).toHaveBeenCalledWith({
        onAppResume: expect.any(Function),
        enabled: true,
      });
    });

    it('should handle app resume with autoRefresh enabled', () => {
      let capturedOnAppResume: (() => void) | undefined;

      mockUseAppVisibility.mockImplementation(({ onAppResume }) => {
        capturedOnAppResume = onAppResume;
      });

      renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: true,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      capturedOnAppResume?.();

      expect(mockResetAndReconnect).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1500);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should not handle app resume with autoRefresh disabled', () => {
      let capturedOnAppResume: (() => void) | undefined;

      mockUseAppVisibility.mockImplementation(({ onAppResume }) => {
        capturedOnAppResume = onAppResume;
      });

      renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: true,
          autoRefresh: false,
          onRefresh: mockOnRefresh,
        })
      );

      capturedOnAppResume?.();

      expect(mockResetAndReconnect).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1500);

      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  describe('error state', () => {
    it('should return wsError from useWebSocket', () => {
      mockUseWebSocket.mockReturnValue({
        lastMessage: null,
        isConnected: false,
        isReconnecting: false,
        reconnectAttempts: 3,
        maxReconnectAttempts: 5,
        connect: mockConnect,
        disconnect: mockDisconnect,
        setTarget: mockSetTarget,
        resetAndReconnect: mockResetAndReconnect,
        error: 'Connection failed',
      });

      const { result } = renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: false,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      expect(result.current.state.wsError).toBe('Connection failed');
      expect(result.current.state.reconnectAttempts).toBe(3);
    });
  });

  describe('reconnecting state', () => {
    it('should return isReconnecting from useWebSocket', () => {
      mockUseWebSocket.mockReturnValue({
        lastMessage: null,
        isConnected: false,
        isReconnecting: true,
        reconnectAttempts: 2,
        maxReconnectAttempts: 5,
        connect: mockConnect,
        disconnect: mockDisconnect,
        setTarget: mockSetTarget,
        resetAndReconnect: mockResetAndReconnect,
        error: null,
      });

      const { result } = renderHook(() =>
        useConnectionState({
          selectedTarget: 'default',
          isConnected: false,
          autoRefresh: true,
          onRefresh: mockOnRefresh,
        })
      );

      expect(result.current.state.isReconnecting).toBe(true);
      expect(result.current.state.reconnectAttempts).toBe(2);
    });
  });
});

import { useCallback } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAppVisibility } from './useAppVisibility';
import { TIMING } from '../../constants/ui';
import { TmuxOutput } from '../../types';

interface UseConnectionStateProps {
  selectedTarget: string;
  isConnected: boolean;
  autoRefresh: boolean;
  onRefresh: () => Promise<string | undefined>;
}

interface ConnectionState {
  wsConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  wsError: string | null;
}

interface ConnectionHandlers {
  wsConnect: () => void;
  wsDisconnect: () => void;
  wsSetTarget: (target: string) => void;
  wsResetAndReconnect: () => void;
}

interface UseConnectionStateReturn {
  state: ConnectionState;
  handlers: ConnectionHandlers;
  lastMessage: TmuxOutput | null;
}

/**
 * Manages WebSocket connection state and reconnection logic
 * Single Responsibility: WebSocket connection management only
 */
export const useConnectionState = ({
  selectedTarget,
  isConnected,
  autoRefresh,
  onRefresh
}: UseConnectionStateProps): UseConnectionStateReturn => {
  const { 
    lastMessage, 
    isConnected: wsConnected, 
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    connect: wsConnect, 
    disconnect: wsDisconnect,
    setTarget: wsSetTarget,
    resetAndReconnect: wsResetAndReconnect,
    error: wsError 
  } = useWebSocket(selectedTarget);

  // Handle app visibility changes for mobile resume
  const handleAppResume = useCallback(() => {
    if (autoRefresh) {
      wsResetAndReconnect();

      setTimeout(() => {
        onRefresh();
      }, TIMING.APP_RESUME_RECONNECT_DELAY);
    }
  }, [autoRefresh, wsResetAndReconnect, onRefresh]);

  useAppVisibility({ 
    onAppResume: handleAppResume, 
    enabled: true 
  });

  const state: ConnectionState = {
    wsConnected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    wsError
  };

  const handlers: ConnectionHandlers = {
    wsConnect,
    wsDisconnect,
    wsSetTarget,
    wsResetAndReconnect
  };

  return {
    state,
    handlers,
    lastMessage
  };
};
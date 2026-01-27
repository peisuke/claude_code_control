import { useEffect } from 'react';

interface UseAutoRefreshStateProps {
  isConnected: boolean;
  autoRefresh: boolean;
  wsConnected: boolean;
  wsConnect: () => void;
  wsDisconnect: () => void;
}

/**
 * Manages auto-refresh logic and WebSocket connection coordination
 * Single Responsibility: Auto-refresh state coordination only
 */
export const useAutoRefreshState = ({
  isConnected,
  autoRefresh,
  wsConnected,
  wsConnect,
  wsDisconnect
}: UseAutoRefreshStateProps): void => {
  // Handle autoRefresh state changes
  useEffect(() => {
    if (isConnected && autoRefresh && !wsConnected) {
      wsConnect();
    } else if (!autoRefresh && wsConnected) {
      wsDisconnect();
    }
  }, [autoRefresh, isConnected, wsConnected, wsConnect, wsDisconnect]);
};
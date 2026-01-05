import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/websocket';
import { TmuxOutput } from '../types';

interface UseWebSocketReturn {
  lastMessage: TmuxOutput | null;
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  connect: () => void;
  disconnect: () => void;
  setTarget: (target: string) => void;
  forceReconnect: () => void;
  resetAndReconnect: () => void;
  error: string | null;
}

export const useWebSocket = (target: string = 'default'): UseWebSocketReturn => {
  const [lastMessage, setLastMessage] = useState<TmuxOutput | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState(999); // Unlimited
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const wsRef = useRef<WebSocketService | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.isConnected()) {
      return;
    }

    setError(null);
    
    try {
      if (!wsRef.current) {
        wsRef.current = new WebSocketService(target);
        
        wsRef.current.onMessage((output: TmuxOutput) => {
          setLastMessage(output);
        });
        
        wsRef.current.onConnection((connected: boolean) => {
          setIsConnected(connected);
          if (!connected) {
            setError('WebSocket disconnected');
          } else {
            setError(null);
            setReconnectAttempts(0);
            setIsReconnecting(false);
          }
        });

        wsRef.current.onReconnecting((attempt: number, maxAttempts: number) => {
          setIsReconnecting(true);
          setReconnectAttempts(attempt);
          setMaxReconnectAttempts(maxAttempts);
          setError(`Reconnecting... (${attempt}/${maxAttempts})`);
        });
      }
      
      wsRef.current.connect().catch((err) => {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setIsConnected(false);
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create WebSocket');
      setIsConnected(false);
    }
  }, [target]);

  const setTarget = useCallback((newTarget: string) => {
    if (wsRef.current) {
      wsRef.current.setTarget(newTarget);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
    setLastMessage(null);
  }, []);

  const forceReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.forceReconnect();
    }
  }, []);

  const resetAndReconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.resetAndReconnect();
    }
    setError(null);
    setIsReconnecting(false);
    setReconnectAttempts(0);
  }, []);

  // Handle network state changes
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network back online, attempting to reconnect...');
      setIsOnline(true);
      setError(null);
      
      // If we were trying to reconnect, force a fresh connection attempt
      if (isReconnecting || !isConnected) {
        setTimeout(() => {
          if (wsRef.current) {
            wsRef.current.forceReconnect();
          }
        }, 1000);
      }
    };

    const handleOffline = () => {
      console.log('Network went offline');
      setIsOnline(false);
      setError('Network offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isReconnecting, isConnected]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    lastMessage,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    connect,
    disconnect,
    setTarget,
    forceReconnect,
    resetAndReconnect,
    error,
  };
};
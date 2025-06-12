import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketService } from '../services/websocket';
import { TmuxOutput } from '../types';

interface UseWebSocketReturn {
  lastMessage: TmuxOutput | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  setTarget: (target: string) => void;
  error: string | null;
}

export const useWebSocket = (target: string = 'default'): UseWebSocketReturn => {
  const [lastMessage, setLastMessage] = useState<TmuxOutput | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          }
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
    setLastMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    lastMessage,
    isConnected,
    connect,
    disconnect,
    setTarget,
    error,
  };
};
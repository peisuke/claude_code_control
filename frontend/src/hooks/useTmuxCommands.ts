import { useCallback } from 'react';
import { useTmux } from './useTmux';
import { tmuxAPI } from '../services/api';
import { TIMING } from '../constants/ui';
import { TmuxUtils } from '../utils/tmux';

interface UseTmuxCommandsReturn {
  sendCommand: (command: string, target: string) => Promise<void>;
  sendEnter: (target: string) => Promise<void>;
  sendKeyboardCommand: (keyCommand: string, target: string) => Promise<void>;
  showHistory: (target: string) => Promise<string>;
}

interface UseTmuxCommandsOptions {
  onRefresh?: () => Promise<void>;
  onOutput?: (output: string) => void;
  autoRefresh?: boolean;
  setAutoRefresh?: (value: boolean) => void;
  wsDisconnect?: () => void;
}

/**
 * Hook to handle tmux command operations with standardized delay and error handling
 */
export const useTmuxCommands = ({
  onRefresh,
  onOutput,
  autoRefresh,
  setAutoRefresh,
  wsDisconnect
}: UseTmuxCommandsOptions = {}): UseTmuxCommandsReturn => {
  const tmux = useTmux();

  const sendCommand = useCallback(async (command: string, target: string) => {
    if (!TmuxUtils.isValidCommand(command)) return;
    
    const sanitizedCommand = TmuxUtils.sanitizeCommand(command);
    await tmux.sendCommand(sanitizedCommand, target);
    
    // Refresh output after command
    if (onRefresh) {
      setTimeout(onRefresh, TIMING.COMMAND_REFRESH_DELAY);
    }
  }, [tmux, onRefresh]);

  const sendEnter = useCallback(async (target: string) => {
    await tmux.sendEnter(target);
    
    // Refresh output after enter
    if (onRefresh) {
      setTimeout(onRefresh, TIMING.COMMAND_REFRESH_DELAY);
    }
  }, [tmux, onRefresh]);

  const sendKeyboardCommand = useCallback(async (keyCommand: string, target: string) => {
    await tmux.sendCommand(keyCommand, target);
    
    // Shorter delay for keyboard commands
    if (onRefresh) {
      setTimeout(onRefresh, 200);
    }
  }, [tmux, onRefresh]);

  const showHistory = useCallback(async (target: string): Promise<string> => {
    // Disable auto-refresh when showing history
    if (autoRefresh && setAutoRefresh && wsDisconnect) {
      setAutoRefresh(false);
      wsDisconnect();
      // Wait for WebSocket to fully disconnect
      await new Promise(resolve => setTimeout(resolve, TIMING.HISTORY_REFRESH_DELAY));
    }
    
    const response = await tmuxAPI.getOutput(target, true, 2000);
    const historyContent = response.content;
    
    if (onOutput) {
      onOutput(historyContent);
    }
    
    return historyContent;
  }, [autoRefresh, setAutoRefresh, wsDisconnect, onOutput]);

  return {
    sendCommand,
    sendEnter,
    sendKeyboardCommand,
    showHistory,
  };
};
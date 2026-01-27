import { useCallback } from 'react';
import { useTmux } from './useTmux';
import { TIMING } from '../constants/ui';
import { TmuxUtils } from '../utils/tmux';

interface UseTmuxCommandsReturn {
  sendCommand: (command: string, target: string) => Promise<void>;
  sendEnter: (target: string) => Promise<void>;
  sendKeyboardCommand: (keyCommand: string, target: string) => Promise<void>;
}

interface UseTmuxCommandsOptions {
  onRefresh?: () => Promise<void>;
}

/**
 * Hook to handle tmux command operations with standardized delay and error handling
 */
export const useTmuxCommands = ({
  onRefresh
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

  return {
    sendCommand,
    sendEnter,
    sendKeyboardCommand
  };
};
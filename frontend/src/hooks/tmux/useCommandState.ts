import { useState, useCallback } from 'react';
import { useTmux } from './useTmux';
import { TIMING } from '../../constants/ui';
import { TmuxUtils } from '../../utils/tmux';

interface UseCommandStateProps {
  selectedTarget: string;
  onRefresh: () => Promise<string | undefined>;
}

interface CommandState {
  command: string;
  commandExpanded: boolean;
}

interface CommandHandlers {
  handleSendCommand: () => Promise<void>;
  handleSendEnter: () => Promise<void>;
  handleKeyboardCommand: (keyCommand: string) => Promise<void>;
  setCommand: (command: string) => void;
  setCommandExpanded: (expanded: boolean) => void;
}

interface UseCommandStateReturn {
  state: CommandState;
  handlers: CommandHandlers;
}

/**
 * Manages command input state and execution
 * Includes tmux command operations with standardized delay (absorbed from useTmuxCommands)
 */
export const useCommandState = ({
  selectedTarget,
  onRefresh
}: UseCommandStateProps): UseCommandStateReturn => {
  const [command, setCommand] = useState('');
  const [commandExpanded, setCommandExpanded] = useState(false);
  const { sendCommand: tmuxSendCommand, sendEnter: tmuxSendEnter } = useTmux();

  const handleSendCommand = useCallback(async () => {
    if (!command.trim()) return;

    try {
      const sanitizedCommand = TmuxUtils.sanitizeCommand(command);
      if (!TmuxUtils.isValidCommand(sanitizedCommand)) return;

      await tmuxSendCommand(sanitizedCommand, selectedTarget);
      setCommand('');

      setTimeout(onRefresh, TIMING.COMMAND_REFRESH_DELAY);
    } catch {
      // Silently fail command send
    }
  }, [command, tmuxSendCommand, selectedTarget, onRefresh]);

  const handleSendEnter = useCallback(async () => {
    try {
      await tmuxSendEnter(selectedTarget);
      setTimeout(onRefresh, TIMING.COMMAND_REFRESH_DELAY);
    } catch {
      // Silently fail enter send
    }
  }, [tmuxSendEnter, selectedTarget, onRefresh]);

  const handleKeyboardCommand = useCallback(async (keyCommand: string) => {
    try {
      await tmuxSendCommand(keyCommand, selectedTarget);
      setTimeout(onRefresh, 200);
    } catch {
      // Silently fail keyboard command
    }
  }, [tmuxSendCommand, selectedTarget, onRefresh]);

  const state: CommandState = {
    command,
    commandExpanded
  };

  const handlers: CommandHandlers = {
    handleSendCommand,
    handleSendEnter,
    handleKeyboardCommand,
    setCommand,
    setCommandExpanded
  };

  return {
    state,
    handlers
  };
};

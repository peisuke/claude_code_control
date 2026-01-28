import { useState, useCallback } from 'react';
import { useTmuxCommands } from './useTmuxCommands';

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
 * Single Responsibility: Command handling only
 */
export const useCommandState = ({
  selectedTarget,
  onRefresh
}: UseCommandStateProps): UseCommandStateReturn => {
  const [command, setCommand] = useState('');
  const [commandExpanded, setCommandExpanded] = useState(false);

  // Initialize tmux commands hook
  const { sendCommand, sendEnter, sendKeyboardCommand } = useTmuxCommands({
    onRefresh
  });

  // Handle command send
  const handleSendCommand = useCallback(async () => {
    if (!command.trim()) return;
    
    try {
      await sendCommand(command, selectedTarget);
      setCommand('');
    } catch {
      // Silently fail command send
    }
  }, [command, sendCommand, selectedTarget]);

  const handleSendEnter = useCallback(async () => {
    try {
      await sendEnter(selectedTarget);
    } catch {
      // Silently fail enter send
    }
  }, [sendEnter, selectedTarget]);

  // Handle keyboard commands
  const handleKeyboardCommand = useCallback(async (keyCommand: string) => {
    try {
      await sendKeyboardCommand(keyCommand, selectedTarget);
    } catch {
      // Silently fail keyboard command
    }
  }, [sendKeyboardCommand, selectedTarget]);

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
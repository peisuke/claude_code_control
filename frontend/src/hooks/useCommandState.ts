import { useState, useCallback } from 'react';
import { useTmuxCommands } from './useTmuxCommands';

interface UseCommandStateProps {
  selectedTarget: string;
  onRefresh: () => Promise<void>;
  onOutput: (output: string) => void;
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
  onRefresh,
  onOutput
}: UseCommandStateProps): UseCommandStateReturn => {
  const [command, setCommand] = useState('');
  const [commandExpanded, setCommandExpanded] = useState(false);

  // Initialize tmux commands hook
  const { sendCommand, sendEnter, sendKeyboardCommand } = useTmuxCommands({
    onRefresh,
    onOutput
  });

  // Handle command send
  const handleSendCommand = useCallback(async () => {
    if (!command.trim()) return;
    
    try {
      await sendCommand(command, selectedTarget);
      setCommand('');
    } catch (error) {
      // Error is handled by the hook
      console.error('Error sending command:', error);
    }
  }, [command, sendCommand, selectedTarget]);

  const handleSendEnter = useCallback(async () => {
    try {
      await sendEnter(selectedTarget);
    } catch (error) {
      // Error is handled by the hook
      console.error('Error sending enter:', error);
    }
  }, [sendEnter, selectedTarget]);

  // Handle keyboard commands
  const handleKeyboardCommand = useCallback(async (keyCommand: string) => {
    try {
      await sendKeyboardCommand(keyCommand, selectedTarget);
    } catch (error) {
      console.error('Error with keyboard command:', error);
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
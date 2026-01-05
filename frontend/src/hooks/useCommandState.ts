import { useState, useCallback } from 'react';
import { useTmuxCommands } from './useTmuxCommands';

interface UseCommandStateProps {
  selectedTarget: string;
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
  onRefresh: () => Promise<void>;
  onOutput: (output: string) => void;
  wsDisconnect: () => void;
}

interface CommandState {
  command: string;
  commandExpanded: boolean;
}

interface CommandHandlers {
  handleSendCommand: () => Promise<void>;
  handleSendEnter: () => Promise<void>;
  handleKeyboardCommand: (keyCommand: string) => Promise<void>;
  handleShowHistory: () => Promise<void>;
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
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  onOutput,
  wsDisconnect
}: UseCommandStateProps): UseCommandStateReturn => {
  const [command, setCommand] = useState('');
  const [commandExpanded, setCommandExpanded] = useState(false);

  // Initialize tmux commands hook
  const { sendCommand, sendEnter, sendKeyboardCommand, showHistory } = useTmuxCommands({
    onRefresh,
    onOutput,
    autoRefresh,
    setAutoRefresh,
    wsDisconnect
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

  // Handle show history
  const handleShowHistory = useCallback(async () => {
    try {
      await showHistory(selectedTarget);
    } catch (error) {
      console.error('Error getting history:', error);
    }
  }, [showHistory, selectedTarget]);

  const state: CommandState = {
    command,
    commandExpanded
  };

  const handlers: CommandHandlers = {
    handleSendCommand,
    handleSendEnter,
    handleKeyboardCommand,
    handleShowHistory,
    setCommand,
    setCommandExpanded
  };

  return {
    state,
    handlers
  };
};
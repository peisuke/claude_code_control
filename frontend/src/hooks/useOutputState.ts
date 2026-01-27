import { useCallback, useEffect } from 'react';
import { useTerminalOutput } from './useTerminalOutput';
import { useTmux } from './useTmux';
import { TIMING } from '../constants/ui';

interface UseOutputStateProps {
  selectedTarget: string;
  isConnected: boolean;
  lastMessage: any;
  autoRefresh: boolean;
}

interface OutputState {
  output: string;
  isLoading: boolean;
  error: string | null;
}

interface OutputHandlers {
  handleRefresh: () => Promise<void>;
  setOutput: (output: string) => void;
  scrollToBottom: () => void;
}

interface UseOutputStateReturn {
  state: OutputState;
  handlers: OutputHandlers;
}

/**
 * Manages terminal output state and refresh logic
 * Single Responsibility: Output management only
 */
export const useOutputState = ({
  selectedTarget,
  isConnected,
  lastMessage,
  autoRefresh
}: UseOutputStateProps): UseOutputStateReturn => {
  const { output, setOutput, scrollToBottom } = useTerminalOutput();
  const { getOutput, isLoading, error } = useTmux();

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      const outputContent = await getOutput(selectedTarget);
      setOutput(outputContent);
      setTimeout(() => scrollToBottom(), TIMING.SCROLL_ANIMATION_DELAY);
    } catch {
      // Silently fail output refresh
    }
  }, [getOutput, selectedTarget, setOutput, scrollToBottom]);

  // Handle target change
  useEffect(() => {
    if (selectedTarget) {
      setOutput('');
      if (isConnected) {
        handleRefresh();
      }
    }
  }, [selectedTarget, isConnected, handleRefresh, setOutput]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.target === selectedTarget && autoRefresh) {
      setOutput(lastMessage.content);
      setTimeout(() => scrollToBottom(), TIMING.SCROLL_ANIMATION_DELAY);
    }
  }, [lastMessage, selectedTarget, autoRefresh, scrollToBottom, setOutput]);

  // Initial load
  useEffect(() => {
    if (isConnected) {
      handleRefresh();
    }
  }, [isConnected, handleRefresh]);

  const state: OutputState = {
    output,
    isLoading,
    error
  };

  const handlers: OutputHandlers = {
    handleRefresh,
    setOutput,
    scrollToBottom
  };

  return {
    state,
    handlers
  };
};
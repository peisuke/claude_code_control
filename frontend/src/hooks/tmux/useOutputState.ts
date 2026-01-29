import { useCallback, useEffect } from 'react';
import { useTmux } from './useTmux';
import { TmuxOutput } from '../../types';

interface UseOutputStateProps {
  selectedTarget: string;
  isConnected: boolean;
  lastMessage: TmuxOutput | null;
  autoRefresh: boolean;
}

interface OutputState {
  output: string;
  isLoading: boolean;
  error: string | null;
}

interface OutputHandlers {
  handleRefresh: () => Promise<string | undefined>;
  setOutput: (output: string) => void;
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
  const { output, setOutput, getOutput, isLoading, error } = useTmux();

  // Refresh handler - returns output content for immediate use
  // Note: Scroll behavior is handled by useScrollBasedOutput in TmuxViewContainer
  const handleRefresh = useCallback(async (): Promise<string | undefined> => {
    try {
      const outputContent = await getOutput(selectedTarget);
      setOutput(outputContent);
      return outputContent;
    } catch {
      // Silently fail output refresh
      return undefined;
    }
  }, [getOutput, selectedTarget, setOutput]);

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
  // Note: Scroll behavior is handled by useScrollBasedOutput in TmuxViewContainer
  useEffect(() => {
    if (lastMessage && lastMessage.target === selectedTarget && autoRefresh) {
      setOutput(lastMessage.content);
    }
  }, [lastMessage, selectedTarget, autoRefresh, setOutput]);

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
    setOutput
  };

  return {
    state,
    handlers
  };
};
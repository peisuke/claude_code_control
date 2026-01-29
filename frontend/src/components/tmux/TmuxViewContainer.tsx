import React from 'react';
import { Paper, Box } from '@mui/material';
import TerminalOutput from '../terminal/TerminalOutput';
import CommandInputArea from '../terminal/CommandInputArea';
import TmuxKeyboard from '../terminal/TmuxKeyboard';
import { useScrollBasedOutput } from '../../hooks/tmux';

interface TmuxViewContainerProps {
  output: string;
  isConnected: boolean;
  commandExpanded: boolean;
  command: string;
  onCommandChange: (command: string) => void;
  onSendCommand: () => Promise<void>;
  onSendEnter: () => Promise<void>;
  onSendKeyboardCommand: (command: string) => Promise<void>;
  onToggleExpanded: () => void;
  isLoading: boolean;
  selectedTarget: string;
  onRefresh?: () => Promise<string | undefined>;
}

const TmuxViewContainer: React.FC<TmuxViewContainerProps> = ({
  output,
  isConnected,
  commandExpanded,
  command,
  onCommandChange,
  onSendCommand,
  onSendEnter,
  onSendKeyboardCommand,
  onToggleExpanded,
  isLoading,
  selectedTarget,
  onRefresh
}) => {
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [hasPendingUpdates, setHasPendingUpdates] = React.useState(false);
  const isInitialMountRef = React.useRef(true);
  const prevOutputRef = React.useRef(output);
  const forceUpdateRef = React.useRef(false);

  // Use scroll-based output hook for infinite scrolling and auto-scroll behavior
  const {
    output: scrollBasedOutput,
    isLoadingHistory,
    handleScroll,
    setOutput,
    outputRef,
    scrollToBottom,
    checkIsAtBottom
  } = useScrollBasedOutput({
    selectedTarget,
    isConnected,
    initialOutput: output
  });

  // Auto-update when at bottom, track pending updates when scrolled up
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;

    // Always update on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setOutput(output);
      prevOutputRef.current = output;
      return;
    }

    // Check if output actually changed from what we've displayed
    const outputChanged = output !== prevOutputRef.current;

    // Use real-time check instead of potentially stale state
    const currentlyAtBottom = checkIsAtBottom();

    // Force update if refresh was requested, or auto-update if at bottom
    const shouldForceUpdate = forceUpdateRef.current;
    if (shouldForceUpdate) {
      forceUpdateRef.current = false;
    }

    if (currentlyAtBottom || shouldForceUpdate) {
      // Only update prevOutputRef when we actually display the output
      prevOutputRef.current = output;
      setOutput(output);
      setHasPendingUpdates(false);
      // Use setTimeout to scroll after render
      timeoutId = setTimeout(() => scrollToBottom(), 0);
    } else if (outputChanged) {
      // If scrolled up and output changed, mark as having pending updates
      // Don't update prevOutputRef - we haven't displayed this output yet
      setHasPendingUpdates(true);
    }

    // Cleanup timeout on unmount or re-run
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [output, setOutput, checkIsAtBottom, scrollToBottom]);

  // Handle refresh button click - fetches new output and scrolls to bottom
  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      // onRefresh now returns the fetched output directly
      const newOutput = await onRefresh();
      if (newOutput !== undefined) {
        prevOutputRef.current = newOutput;
        setOutput(newOutput);
        setHasPendingUpdates(false);
        setTimeout(() => scrollToBottom(), 0);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, setOutput, scrollToBottom]);

  // Wrap command functions to force update after sending
  const handleSendCommand = React.useCallback(async () => {
    forceUpdateRef.current = true;
    await onSendCommand();
  }, [onSendCommand]);

  const handleSendEnter = React.useCallback(async () => {
    forceUpdateRef.current = true;
    await onSendEnter();
  }, [onSendEnter]);

  const handleSendKeyboardCommand = React.useCallback(async (cmd: string) => {
    forceUpdateRef.current = true;
    await onSendKeyboardCommand(cmd);
  }, [onSendKeyboardCommand]);

  return (
    <Box sx={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Terminal Output - Hidden when command input is expanded */}
      <Paper sx={{
        flex: commandExpanded ? 0 : 1,
        minHeight: 0,
        display: commandExpanded ? 'none' : 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <TerminalOutput
          output={scrollBasedOutput}
          onScroll={handleScroll}
          outputRef={outputRef}
          isLoadingHistory={isLoadingHistory}
          onRefresh={onRefresh ? handleRefresh : undefined}
          isRefreshing={isRefreshing}
          hasPendingUpdates={hasPendingUpdates}
        />
        <TmuxKeyboard
          isConnected={isConnected}
          isLoading={isLoading}
          onSendCommand={handleSendKeyboardCommand}
        />
      </Paper>

      {/* Command Input - Full height when expanded */}
      <Paper sx={{
        p: 1.5,
        flex: commandExpanded ? 1 : 'none',
        minHeight: commandExpanded ? 0 : 'auto',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <CommandInputArea
          command={command}
          onCommandChange={onCommandChange}
          onSendCommand={handleSendCommand}
          onSendEnter={handleSendEnter}
          onSendKeyboardCommand={handleSendKeyboardCommand}
          isConnected={isConnected}
          isLoading={isLoading}
          isExpanded={commandExpanded}
          onToggleExpanded={onToggleExpanded}
        />
      </Paper>
    </Box>
  );
};

export default TmuxViewContainer;
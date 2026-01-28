import React from 'react';
import { Paper, Box } from '@mui/material';
import TerminalOutput from '../terminal/TerminalOutput';
import CommandInputArea from '../terminal/CommandInputArea';
import TmuxKeyboard from '../terminal/TmuxKeyboard';
import { useScrollBasedOutput } from '../../hooks/useScrollBasedOutput';

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
  onRefresh?: () => Promise<void>;
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
  const refreshRequestedRef = React.useRef(false);
  const isInitialMountRef = React.useRef(true);

  // Use scroll-based output hook for infinite scrolling and auto-scroll behavior
  const {
    output: scrollBasedOutput,
    isLoadingHistory,
    handleScroll,
    setOutput,
    outputRef,
    scrollToBottom
  } = useScrollBasedOutput({
    selectedTarget,
    isConnected,
    initialOutput: output
  });

  // Only update output on initial mount or when refresh was requested
  // This prevents auto-updates from WebSocket while allowing manual refresh
  React.useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setOutput(output);
      return;
    }
    if (refreshRequestedRef.current) {
      refreshRequestedRef.current = false;
      setOutput(output);
    }
  }, [output, setOutput]);

  // Handle refresh button click - fetches new output and scrolls to bottom
  const handleRefresh = React.useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    refreshRequestedRef.current = true;
    try {
      await onRefresh();
      scrollToBottom();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, scrollToBottom]);

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
        />
        <TmuxKeyboard
          isConnected={isConnected}
          isLoading={isLoading}
          onSendCommand={onSendKeyboardCommand}
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
          onSendCommand={onSendCommand}
          onSendEnter={onSendEnter}
          onSendKeyboardCommand={onSendKeyboardCommand}
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
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
  selectedTarget
}) => {
  // Use scroll-based output hook for infinite scrolling and auto-scroll behavior
  const {
    output: scrollBasedOutput,
    isLoadingHistory,
    handleScroll,
    setOutput,
    outputRef
  } = useScrollBasedOutput({
    selectedTarget,
    isConnected,
    initialOutput: output
  });

  // Update scroll-based output when WebSocket updates arrive
  React.useEffect(() => {
    setOutput(output);
  }, [output, setOutput]);

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
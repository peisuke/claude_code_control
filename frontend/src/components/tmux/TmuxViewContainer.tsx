import React from 'react';
import { Paper } from '@mui/material';
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
  onOutputUpdate: (output: string) => void;
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
  onOutputUpdate
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
    <>
      {/* Terminal Output - Fixed container, always present for stable layout */}
      <Paper sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        visibility: commandExpanded ? 'hidden' : 'visible',
        height: commandExpanded ? '0' : 'auto',
        transition: 'height 0.3s ease-in-out, visibility 0.3s ease-in-out'
      }}>
        <TerminalOutput
          output={scrollBasedOutput}
          isConnected={isConnected}
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

      {/* Command Input - Fixed height when expanded */}
      <Paper sx={{
        p: 1.5,
        flexShrink: 0,
        height: commandExpanded ? '40vh' : 'auto',
        transition: 'height 0.3s ease-in-out',
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
    </>
  );
};

export default TmuxViewContainer;
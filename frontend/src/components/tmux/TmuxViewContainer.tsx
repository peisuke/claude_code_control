import React from 'react';
import { Paper } from '@mui/material';
import TerminalOutput from '../terminal/TerminalOutput';
import CommandInputArea from '../terminal/CommandInputArea';
import TmuxKeyboard from '../terminal/TmuxKeyboard';

interface TmuxViewContainerProps {
  output: string;
  isConnected: boolean;
  commandExpanded: boolean;
  command: string;
  onCommandChange: (command: string) => void;
  onSendCommand: () => Promise<void>;
  onSendEnter: () => Promise<void>;
  onSendKeyboardCommand: (command: string) => Promise<void>;
  onShowHistory: () => Promise<void>;
  onToggleExpanded: () => void;
  isLoading: boolean;
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
  onShowHistory,
  onToggleExpanded,
  isLoading
}) => {
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
          output={output}
          isConnected={isConnected}
          autoScroll={true}
          onShowHistory={onShowHistory}
          isLoading={isLoading}
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
import React, { useState, useEffect, useCallback } from 'react';
import { Stack, Paper } from '@mui/material';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTerminalOutput } from '../hooks/useTerminalOutput';
import { useAppVisibility } from '../hooks/useAppVisibility';
import { useTmuxCommands } from '../hooks/useTmuxCommands';
import { useLocalStorageString, useLocalStorageBoolean } from '../hooks/useLocalStorageState';
import { useTmux } from '../hooks/useTmux';
import ControlPanel from './terminal/ControlPanel';
import TerminalOutput from './terminal/TerminalOutput';
import CommandInputArea from './terminal/CommandInputArea';
import TmuxKeyboard from './terminal/TmuxKeyboard';
import FileView from './FileView';
import { VIEW_MODES, TIMING } from '../constants/ui';

interface UnifiedViewProps {
  isConnected: boolean;
  onSettingsOpen: () => void;
  selectedTarget: string;
  onTargetChange: (target: string) => void;
}

const UnifiedView: React.FC<UnifiedViewProps> = ({ 
  isConnected, 
  onSettingsOpen,
  selectedTarget,
  onTargetChange
}) => {
  // Local state
  const [command, setCommand] = useState('');
  const [autoRefresh, setAutoRefresh] = useLocalStorageBoolean('tmux-auto-refresh', true);
  const [viewMode, setViewMode] = useLocalStorageString('tmux-view-mode', VIEW_MODES.TMUX);
  const [commandExpanded, setCommandExpanded] = useState(false);

  // Custom hooks
  const { output, setOutput, scrollToBottom } = useTerminalOutput();
  const { getOutput, isLoading, error } = useTmux();
  
  const { 
    lastMessage, 
    isConnected: wsConnected, 
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    connect: wsConnect, 
    disconnect: wsDisconnect,
    setTarget: wsSetTarget,
    resetAndReconnect: wsResetAndReconnect,
    error: wsError 
  } = useWebSocket(selectedTarget);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      const outputContent = await getOutput(selectedTarget);
      setOutput(outputContent);
      setTimeout(() => scrollToBottom(), TIMING.SCROLL_ANIMATION_DELAY);
    } catch (error) {
      // Error is handled by the hook
    }
  }, [getOutput, selectedTarget, setOutput, scrollToBottom]);

  // Initialize tmux commands hook
  const { sendCommand, sendEnter, sendKeyboardCommand, showHistory } = useTmuxCommands({
    onRefresh: handleRefresh,
    onOutput: setOutput,
    autoRefresh,
    setAutoRefresh,
    wsDisconnect
  });

  // Handle command send
  const handleSendCommand = async () => {
    if (!command.trim()) return;
    
    try {
      await sendCommand(command, selectedTarget);
      setCommand('');
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendEnter = async () => {
    try {
      await sendEnter(selectedTarget);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle keyboard commands
  const handleKeyboardCommand = async (keyCommand: string) => {
    try {
      await sendKeyboardCommand(keyCommand, selectedTarget);
    } catch (error) {
      console.error('Error with keyboard command:', error);
    }
  };

  // Handle show history
  const handleShowHistory = async () => {
    try {
      await showHistory(selectedTarget);
      setTimeout(() => scrollToBottom(), TIMING.SCROLL_ANIMATION_DELAY);
    } catch (error) {
      console.error('Error getting history:', error);
    }
  };

  // Handle view mode toggle
  const handleViewModeToggle = () => {
    const newMode = viewMode === VIEW_MODES.TMUX ? VIEW_MODES.FILE : VIEW_MODES.TMUX;
    setViewMode(newMode);
  };

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = () => {
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
    
    if (newAutoRefresh) {
      wsConnect();
    } else {
      wsDisconnect();
    }
  };

  // Handle app visibility changes for mobile resume
  const handleAppResume = () => {
    console.log('Current state:', { autoRefresh, wsConnected, isConnected });
    
    if (autoRefresh) {
      console.log('Auto-refresh enabled, forcing reconnection...');
      wsResetAndReconnect();
      
      setTimeout(() => {
        handleRefresh();
      }, TIMING.APP_RESUME_RECONNECT_DELAY);
    } else {
      console.log('Auto-refresh disabled, skipping reconnection');
    }
  };

  useAppVisibility({ 
    onAppResume: handleAppResume, 
    enabled: true 
  });

  // Handle target change
  useEffect(() => {
    if (selectedTarget) {
      wsSetTarget(selectedTarget);
      setOutput('');
      if (isConnected) {
        handleRefresh();
      }
    }
  }, [selectedTarget, isConnected, wsSetTarget, handleRefresh, setOutput]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.target === selectedTarget && autoRefresh) {
      setOutput(lastMessage.content);
      setTimeout(() => scrollToBottom(), TIMING.SCROLL_ANIMATION_DELAY);
    }
  }, [lastMessage, selectedTarget, autoRefresh, scrollToBottom, setOutput]);

  // Initial load and auto-refresh setup
  useEffect(() => {
    if (isConnected) {
      handleRefresh();
      if (autoRefresh && !wsConnected) {
        wsConnect();
      }
    }
  }, [isConnected, autoRefresh, wsConnected, wsConnect, handleRefresh]);

  // Handle autoRefresh state changes
  useEffect(() => {
    if (isConnected && autoRefresh && !wsConnected) {
      wsConnect();
    } else if (!autoRefresh && wsConnected) {
      wsDisconnect();
    }
  }, [autoRefresh, isConnected, wsConnected, wsConnect, wsDisconnect]);


  return (
    <Stack spacing={2} sx={{ height: '100vh', p: 2, overflow: 'hidden' }}>
      {/* Control Panel - Fixed height */}
      <Paper sx={{ flexShrink: 0 }}>
        <ControlPanel
          viewMode={viewMode as 'tmux' | 'file'}
          onViewModeToggle={handleViewModeToggle}
          isConnected={isConnected}
          wsConnected={wsConnected}
          isReconnecting={isReconnecting}
          reconnectAttempts={reconnectAttempts}
          maxReconnectAttempts={maxReconnectAttempts}
          onReconnect={wsResetAndReconnect}
          onSettingsOpen={onSettingsOpen}
          selectedTarget={selectedTarget}
          onTargetChange={onTargetChange}
          autoRefresh={autoRefresh}
          onAutoRefreshToggle={handleAutoRefreshToggle}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          error={error}
          wsError={wsError}
        />
      </Paper>

      {/* Terminal Output - Fixed container, always present for stable layout */}
      {viewMode === VIEW_MODES.TMUX && (
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
          />
          <TmuxKeyboard
            isConnected={isConnected}
            isLoading={isLoading}
            onSendCommand={handleKeyboardCommand}
            onShowHistory={handleShowHistory}
          />
        </Paper>
      )}

      {/* Command Input - Fixed height when expanded */}
      {viewMode === VIEW_MODES.TMUX && (
        <Paper sx={{ 
          p: 2, 
          flexShrink: 0,
          height: commandExpanded ? '40vh' : 'auto',
          transition: 'height 0.3s ease-in-out',
          overflow: 'hidden'
        }}>
          <CommandInputArea
            command={command}
            onCommandChange={setCommand}
            onSendCommand={handleSendCommand}
            onSendEnter={handleSendEnter}
            onSendKeyboardCommand={handleKeyboardCommand}
            isConnected={isConnected}
            isLoading={isLoading}
            isExpanded={commandExpanded}
            onToggleExpanded={() => setCommandExpanded(!commandExpanded)}
          />
        </Paper>
      )}
      
      {/* File View - Show when in file mode */}
      {viewMode === VIEW_MODES.FILE && (
        <Paper sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <FileView isConnected={isConnected} />
        </Paper>
      )}
    </Stack>
  );
};

export default UnifiedView;
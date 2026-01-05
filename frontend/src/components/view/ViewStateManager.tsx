import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useTerminalOutput } from '../../hooks/useTerminalOutput';
import { useAppVisibility } from '../../hooks/useAppVisibility';
import { useTmuxCommands } from '../../hooks/useTmuxCommands';
import { useLocalStorageString, useLocalStorageBoolean } from '../../hooks/useLocalStorageState';
import { useTmux } from '../../hooks/useTmux';
import { VIEW_MODES, TIMING } from '../../constants/ui';

interface ViewStateManagerProps {
  selectedTarget: string;
  isConnected: boolean;
  children: (state: ViewState, handlers: ViewHandlers) => React.ReactNode;
}

export interface ViewState {
  command: string;
  autoRefresh: boolean;
  viewMode: string;
  commandExpanded: boolean;
  output: string;
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  wsError: string | null;
}

export interface ViewHandlers {
  handleSendCommand: () => Promise<void>;
  handleSendEnter: () => Promise<void>;
  handleKeyboardCommand: (keyCommand: string) => Promise<void>;
  handleShowHistory: () => Promise<void>;
  handleViewModeToggle: () => void;
  handleAutoRefreshToggle: () => void;
  handleRefresh: () => Promise<void>;
  wsResetAndReconnect: () => void;
  setCommand: (command: string) => void;
  setCommandExpanded: (expanded: boolean) => void;
}

const ViewStateManager: React.FC<ViewStateManagerProps> = ({
  selectedTarget,
  isConnected,
  children
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
  const handleSendCommand = useCallback(async () => {
    if (!command.trim()) return;
    
    try {
      await sendCommand(command, selectedTarget);
      setCommand('');
    } catch (error) {
      // Error is handled by the hook
    }
  }, [command, sendCommand, selectedTarget]);

  const handleSendEnter = useCallback(async () => {
    try {
      await sendEnter(selectedTarget);
    } catch (error) {
      // Error is handled by the hook
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
      setTimeout(() => scrollToBottom(), TIMING.SCROLL_ANIMATION_DELAY);
    } catch (error) {
      console.error('Error getting history:', error);
    }
  }, [showHistory, selectedTarget, scrollToBottom]);

  // Handle view mode toggle
  const handleViewModeToggle = useCallback(() => {
    const newMode = viewMode === VIEW_MODES.TMUX ? VIEW_MODES.FILE : VIEW_MODES.TMUX;
    setViewMode(newMode);
  }, [viewMode, setViewMode]);

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = useCallback(() => {
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
    
    if (newAutoRefresh) {
      wsConnect();
    } else {
      wsDisconnect();
    }
  }, [autoRefresh, setAutoRefresh, wsConnect, wsDisconnect]);

  // Handle app visibility changes for mobile resume
  const handleAppResume = useCallback(() => {
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
  }, [autoRefresh, wsConnected, isConnected, wsResetAndReconnect, handleRefresh]);

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

  const state: ViewState = {
    command,
    autoRefresh,
    viewMode,
    commandExpanded,
    output,
    isLoading,
    error,
    wsConnected,
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    wsError
  };

  const handlers: ViewHandlers = {
    handleSendCommand,
    handleSendEnter,
    handleKeyboardCommand,
    handleShowHistory,
    handleViewModeToggle,
    handleAutoRefreshToggle,
    handleRefresh,
    wsResetAndReconnect,
    setCommand,
    setCommandExpanded
  };

  return <>{children(state, handlers)}</>;
};

export default ViewStateManager;
import React, { useEffect } from 'react';
import { useConnectionState } from '../../hooks/useConnectionState';
import { useCommandState } from '../../hooks/useCommandState';
import { useOutputState } from '../../hooks/useOutputState';
import { useViewState } from '../../hooks/useViewState';
import { useAutoRefreshState } from '../../hooks/useAutoRefreshState';

interface ViewStateCoordinatorProps {
  selectedTarget: string;
  isConnected: boolean;
  children: (state: CoordinatedState, handlers: CoordinatedHandlers) => React.ReactNode;
}

// Combined state interface (maintains backward compatibility)
export interface CoordinatedState {
  // Command state
  command: string;
  commandExpanded: boolean;
  
  // View state
  autoRefresh: boolean;
  viewMode: string;
  
  // Output state
  output: string;
  isLoading: boolean;
  error: string | null;
  
  // Connection state
  wsConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  wsError: string | null;
}

// Combined handlers interface (maintains backward compatibility)
export interface CoordinatedHandlers {
  // Command handlers
  handleSendCommand: () => Promise<void>;
  handleSendEnter: () => Promise<void>;
  handleKeyboardCommand: (keyCommand: string) => Promise<void>;
  setCommand: (command: string) => void;
  setCommandExpanded: (expanded: boolean) => void;

  // View handlers
  handleViewModeToggle: () => void;

  // Output handlers
  handleRefresh: () => Promise<void>;
  setOutput: (output: string) => void;

  // Connection handlers
  wsResetAndReconnect: () => void;
}

/**
 * Coordinates multiple focused state managers
 * Single Responsibility: State coordination only
 * 
 * This component follows the Coordinator pattern to compose
 * multiple single-responsibility hooks while maintaining
 * backward compatibility with the original ViewStateManager interface.
 */
const ViewStateCoordinator: React.FC<ViewStateCoordinatorProps> = ({
  selectedTarget,
  isConnected,
  children
}) => {
  // Initialize view state (UI state management)
  const {
    state: viewState,
    handlers: viewHandlers
  } = useViewState();

  // Initialize output state (terminal output management)
  const outputStateReturn = useOutputState({
    selectedTarget,
    isConnected,
    lastMessage: null, // Will be updated by connection state
    autoRefresh: viewState.autoRefresh
  });

  // Initialize connection state (WebSocket management)
  const {
    state: connectionState,
    handlers: connectionHandlers,
    lastMessage
  } = useConnectionState({
    selectedTarget,
    isConnected,
    autoRefresh: viewState.autoRefresh,
    onRefresh: outputStateReturn.handlers.handleRefresh
  });

  // Update lastMessage for output state
  const {
    state: outputState,
    handlers: outputHandlers
  } = useOutputState({
    selectedTarget,
    isConnected,
    lastMessage,
    autoRefresh: viewState.autoRefresh
  });

  // Initialize command state (command execution)
  const {
    state: commandState,
    handlers: commandHandlers
  } = useCommandState({
    selectedTarget,
    onRefresh: outputHandlers.handleRefresh
  });

  // Coordinate auto-refresh logic
  useAutoRefreshState({
    isConnected,
    autoRefresh: viewState.autoRefresh,
    wsConnected: connectionState.wsConnected,
    wsConnect: connectionHandlers.wsConnect,
    wsDisconnect: connectionHandlers.wsDisconnect
  });

  // Handle target changes
  useEffect(() => {
    if (selectedTarget) {
      connectionHandlers.wsSetTarget(selectedTarget);
    }
  }, [selectedTarget, connectionHandlers]);

  // Combine all state into coordinated state
  const coordinatedState: CoordinatedState = {
    ...commandState,
    ...viewState,
    ...outputState,
    ...connectionState
  };

  // Combine all handlers into coordinated handlers
  const coordinatedHandlers: CoordinatedHandlers = {
    ...commandHandlers,
    ...outputHandlers,
    setOutput: outputHandlers.setOutput,
    handleViewModeToggle: viewHandlers.handleViewModeToggle,
    wsResetAndReconnect: connectionHandlers.wsResetAndReconnect
  };

  return <>{children(coordinatedState, coordinatedHandlers)}</>;
};

export default ViewStateCoordinator;
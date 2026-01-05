/**
 * Segregated interfaces following Interface Segregation Principle
 * Each interface represents a single concern/responsibility
 */

// View mode management
export interface ViewModeProps {
  viewMode: 'tmux' | 'file';
  onViewModeToggle: () => void;
}

// Connection status and management
export interface ConnectionProps {
  isConnected: boolean;
  wsConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  onReconnect: () => void;
}

// Application settings
export interface SettingsProps {
  onSettingsOpen: () => void;
}

// Target selection for tmux
export interface TargetSelectionProps {
  selectedTarget: string;
  onTargetChange: (target: string) => void;
}

// Refresh functionality
export interface RefreshProps {
  autoRefresh: boolean;
  onAutoRefreshToggle: () => void;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

// Error handling
export interface ErrorProps {
  error?: string | null;
  wsError?: string | null;
}

// Combined interface for components that need all functionality
// (maintains backward compatibility)
export interface ControlPanelProps extends 
  ViewModeProps,
  ConnectionProps,
  SettingsProps,
  TargetSelectionProps,
  RefreshProps,
  ErrorProps {}

// Focused prop interfaces for smaller components
export interface ConnectionStatusProps extends ConnectionProps, ErrorProps {}
export interface RefreshControlProps extends RefreshProps {}
export interface ViewModeSwitchProps extends ViewModeProps {};
export interface TargetSelectorProps extends TargetSelectionProps {};
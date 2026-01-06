import React from 'react';
import {
  Paper,
  Stack,
  Button,
  Alert
} from '@mui/material';
import {
  Folder,
  Terminal,
  Settings
} from '@mui/icons-material';
import { VIEW_MODES, LABELS } from '../../constants/ui';
import ConnectionStatus from '../ConnectionStatus';
import TmuxTargetSelector from '../TmuxTargetSelector';

interface ControlPanelProps {
  // View mode
  viewMode: 'tmux' | 'file';
  onViewModeToggle: () => void;

  // Connection
  isConnected: boolean;
  wsConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  onReconnect: () => void;

  // Settings
  onSettingsOpen: () => void;

  // Target selection
  selectedTarget: string;
  onTargetChange: (target: string) => void;

  // Loading state (for target selector)
  isLoading: boolean;

  // Errors
  error?: string | null;
  wsError?: string | null;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  viewMode,
  onViewModeToggle,
  isConnected,
  wsConnected,
  isReconnecting,
  reconnectAttempts,
  maxReconnectAttempts,
  onReconnect,
  onSettingsOpen,
  selectedTarget,
  onTargetChange,
  isLoading,
  error,
  wsError
}) => {
  const isOnline = navigator.onLine;

  return (
    <Stack spacing={1.5}>
      {/* Header Controls */}
      <Paper sx={{ p: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Button
            variant={viewMode === VIEW_MODES.FILE ? 'contained' : 'outlined'}
            startIcon={viewMode === VIEW_MODES.FILE ? <Terminal /> : <Folder />}
            onClick={onViewModeToggle}
            size="small"
          >
            {viewMode === VIEW_MODES.FILE ? 'Tmux' : 'File'}
          </Button>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <ConnectionStatus
              isConnected={isConnected && wsConnected}
              isReconnecting={isReconnecting}
              reconnectAttempts={reconnectAttempts}
              maxReconnectAttempts={maxReconnectAttempts}
              isOnline={isOnline}
              onReconnect={onReconnect}
            />
            <Button
              variant="outlined"
              startIcon={<Settings />}
              onClick={onSettingsOpen}
              size="small"
            >
              {LABELS.BUTTONS.SETTINGS}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Tmux Controls - only show in tmux mode */}
      {viewMode === VIEW_MODES.TMUX && (
        <Paper sx={{ p: 1.5 }}>
          <Stack spacing={1}>
            {/* Target Selector */}
            <TmuxTargetSelector
              selectedTarget={selectedTarget}
              onTargetChange={onTargetChange}
              disabled={!isConnected || isLoading}
            />

            {/* Error Messages */}
            {error && (
              <Alert severity="error" onClose={() => {}}>
                {error}
              </Alert>
            )}
            {wsError && (
              <Alert severity="warning">
                WebSocket: {wsError}
              </Alert>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

export default ControlPanel;
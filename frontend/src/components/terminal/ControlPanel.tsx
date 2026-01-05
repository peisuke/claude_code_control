import React from 'react';
import { 
  Paper, 
  Stack, 
  Button, 
  Switch, 
  FormControlLabel, 
  Typography, 
  Box, 
  Divider, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { 
  Folder, 
  Terminal, 
  Settings, 
  BugReport, 
  Refresh, 
  PlayArrow, 
  Stop 
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
  
  // Auto refresh
  autoRefresh: boolean;
  onAutoRefreshToggle: () => void;
  
  // Manual refresh
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  
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
  autoRefresh,
  onAutoRefreshToggle,
  isLoading,
  onRefresh,
  error,
  wsError
}) => {
  const isOnline = navigator.onLine;

  return (
    <Stack spacing={2}>
      {/* Header Controls */}
      <Paper sx={{ p: 2 }}>
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
              isConnected={isConnected && (!autoRefresh || wsConnected)} 
              isReconnecting={autoRefresh && isReconnecting}
              reconnectAttempts={reconnectAttempts}
              maxReconnectAttempts={maxReconnectAttempts}
              isOnline={isOnline}
              onReconnect={onReconnect}
            />
            {process.env.REACT_APP_TEST_MODE === 'true' && (
              <Button
                variant="outlined"
                size="small"
                title="デバッグ情報"
              >
                <BugReport fontSize="small" />
              </Button>
            )}
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
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1}>
            {/* Target Selector */}
            <TmuxTargetSelector
              selectedTarget={selectedTarget}
              onTargetChange={onTargetChange}
              disabled={!isConnected || isLoading}
            />
            
            <Divider />
            
            {/* Output Controls */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Button
                variant="contained"
                onClick={onRefresh}
                disabled={!isConnected || isLoading || autoRefresh}
                sx={{ minWidth: 'auto', px: 2 }}
                size="small"
              >
                {isLoading ? <CircularProgress size={16} /> : <Refresh />}
              </Button>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={onAutoRefreshToggle}
                    disabled={!isConnected}
                    size="small"
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {autoRefresh ? <Stop fontSize="small" /> : <PlayArrow fontSize="small" />}
                    <Typography variant="body2">
                      {LABELS.BUTTONS.AUTO_REFRESH}
                    </Typography>
                    {autoRefresh && wsConnected && (
                      <Typography variant="caption" color="success.main">
                        (接続中)
                      </Typography>
                    )}
                  </Box>
                }
              />
            </Stack>

            {/* Error Messages */}
            {error && (
              <Alert severity="error" onClose={() => {}}>
                {error}
              </Alert>
            )}
            {wsError && autoRefresh && (
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
import React from 'react';
import { Stack, Button, Typography, Alert } from '@mui/material';
import { Settings, BugReport } from '@mui/icons-material';
import { SettingsProps, ErrorProps } from '../../types/controlPanel';
import { LABELS } from '../../constants/ui';

interface ControlPanelHeaderProps extends SettingsProps, ErrorProps {}

/**
 * Control panel header with settings and error display
 * Single Responsibility: Header functionality and error display
 */
const ControlPanelHeader: React.FC<ControlPanelHeaderProps> = ({
  onSettingsOpen,
  error,
  wsError
}) => {
  const hasError = error || wsError;

  return (
    <Stack spacing={1}>
      {/* Header with settings */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
          {LABELS.HEADERS.TMUX_CONTROLLER}
        </Typography>
        
        <Stack direction="row" spacing={1}>
          {hasError && (
            <Button
              variant="outlined"
              onClick={() => window.open('/debug', '_blank')}
              startIcon={<BugReport />}
              size="small"
              color="error"
              title="デバッグ情報を表示"
            >
              Debug
            </Button>
          )}
          
          <Button
            variant="outlined"
            onClick={onSettingsOpen}
            startIcon={<Settings />}
            size="small"
            title={LABELS.TOOLTIPS.SETTINGS}
          >
            {LABELS.BUTTONS.SETTINGS}
          </Button>
        </Stack>
      </Stack>

      {/* Error display */}
      {hasError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error && <div>API Error: {error}</div>}
          {wsError && <div>WebSocket Error: {wsError}</div>}
        </Alert>
      )}
    </Stack>
  );
};

export default ControlPanelHeader;
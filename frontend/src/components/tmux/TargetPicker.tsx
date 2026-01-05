import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography
} from '@mui/material';
import { TmuxHierarchy, TmuxTarget } from '../../types';

interface TargetPickerProps {
  hierarchy: TmuxHierarchy | null;
  selectedTarget: string;
  onTargetChange: (target: string) => void;
  disabled?: boolean;
}

const TargetPicker: React.FC<TargetPickerProps> = ({
  hierarchy,
  selectedTarget,
  onTargetChange,
  disabled = false
}) => {
  // Parse current target
  const parseTarget = (target: string): TmuxTarget => {
    const parts = target.split(':');
    const session = parts[0] || 'default';
    
    if (parts.length === 1) {
      return { session };
    }
    
    const windowPart = parts[1] || '';
    const windowPaneParts = windowPart.split('.');
    const window = windowPaneParts[0];
    const pane = windowPaneParts[1];
    
    return { session, window: window || undefined, pane: pane || undefined };
  };

  const buildTarget = (session: string, window?: string, pane?: string): string => {
    let target = session;
    if (window) {
      target += `:${window}`;
      if (pane) {
        target += `.${pane}`;
      }
    }
    return target;
  };

  const currentTarget = parseTarget(selectedTarget);
  const sessions = hierarchy?.sessions || {};
  const currentSession = sessions[currentTarget.session];
  const windows = currentSession?.windows || {};
  const currentWindow = currentTarget.window ? windows[currentTarget.window] : null;
  const panes = currentWindow?.panes || {};

  const handleSessionChange = (session: string) => {
    const sessionData = sessions[session];
    if (sessionData && sessionData.windows) {
      // Get the lowest numbered window
      const windowKeys = Object.keys(sessionData.windows).sort((a, b) => parseInt(a) - parseInt(b));
      if (windowKeys.length > 0) {
        const firstWindow = windowKeys[0];
        const windowData = sessionData.windows[firstWindow];
        
        // If the window has multiple panes, select the lowest numbered pane
        if (windowData.panes && Object.keys(windowData.panes).length > 1) {
          const paneKeys = Object.keys(windowData.panes).sort((a, b) => parseInt(a) - parseInt(b));
          const firstPane = paneKeys[0];
          onTargetChange(buildTarget(session, firstWindow, firstPane));
        } else {
          onTargetChange(buildTarget(session, firstWindow));
        }
      } else {
        onTargetChange(session);
      }
    } else {
      onTargetChange(session);
    }
  };

  const handleWindowChange = (window: string) => {
    const windowData = windows[window];
    if (windowData && windowData.panes && Object.keys(windowData.panes).length > 1) {
      // Select the lowest numbered pane
      const paneKeys = Object.keys(windowData.panes).sort((a, b) => parseInt(a) - parseInt(b));
      const firstPane = paneKeys[0];
      onTargetChange(buildTarget(currentTarget.session, window, firstPane));
    } else {
      onTargetChange(buildTarget(currentTarget.session, window));
    }
  };

  const handlePaneChange = (pane: string) => {
    onTargetChange(buildTarget(currentTarget.session, currentTarget.window, pane));
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        {/* Session Selector */}
        <FormControl sx={{ minWidth: { xs: 80, sm: 120 }, maxWidth: { xs: 100, sm: 150 } }}>
          <InputLabel size="small">セッション</InputLabel>
          <Select
            value={currentTarget.session}
            onChange={(e) => handleSessionChange(e.target.value)}
            disabled={disabled}
            label="セッション"
            size="small"
          >
            {Object.keys(sessions).map((sessionName) => (
              <MenuItem key={sessionName} value={sessionName}>
                {sessionName}
              </MenuItem>
            ))}
            {Object.keys(sessions).length === 0 && (
              <MenuItem value="default">default (新規作成)</MenuItem>
            )}
          </Select>
        </FormControl>

        {/* Window Selector */}
        {currentSession && Object.keys(windows).length > 0 && (
          <FormControl sx={{ minWidth: { xs: 80, sm: 120 }, maxWidth: { xs: 100, sm: 150 } }}>
            <InputLabel size="small">ウィンドウ</InputLabel>
            <Select
              value={currentTarget.window || Object.keys(windows)[0] || ''}
              onChange={(e) => handleWindowChange(e.target.value)}
              disabled={disabled}
              label="ウィンドウ"
              size="small"
            >
              {Object.values(windows)
                .sort((a, b) => parseInt(a.index) - parseInt(b.index))
                .map((window) => (
                  <MenuItem key={window.index} value={window.index}>
                    {window.index}: {window.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}

        {/* Pane Selector */}
        {currentWindow && Object.keys(panes).length > 1 && (
          <FormControl sx={{ minWidth: { xs: 80, sm: 120 }, maxWidth: { xs: 100, sm: 150 } }}>
            <InputLabel size="small">ペイン</InputLabel>
            <Select
              value={currentTarget.pane || Object.keys(panes)[0] || ''}
              onChange={(e) => handlePaneChange(e.target.value)}
              disabled={disabled}
              label="ペイン"
              size="small"
            >
              {Object.values(panes)
                .sort((a, b) => parseInt(a.index) - parseInt(b.index))
                .map((pane) => (
                  <MenuItem key={pane.index} value={pane.index}>
                    {pane.index}: {pane.command}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}

        {/* Target Display */}
        <Box sx={{ ml: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Target: {selectedTarget}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
};

export default TargetPicker;
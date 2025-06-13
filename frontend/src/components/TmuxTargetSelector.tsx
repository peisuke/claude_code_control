import React, { useState, useEffect } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText
} from '@mui/material';
import { Refresh, ExpandMore, BugReport, Settings } from '@mui/icons-material';
import { TmuxHierarchy, TmuxTarget } from '../types';
import { tmuxAPI } from '../services/api';

interface TmuxTargetSelectorProps {
  selectedTarget: string;
  onTargetChange: (target: string) => void;
  disabled?: boolean;
  connectionStatus?: React.ReactNode;
  onSettingsOpen?: () => void;
}

const TmuxTargetSelector: React.FC<TmuxTargetSelectorProps> = ({
  selectedTarget,
  onTargetChange,
  disabled = false,
  connectionStatus,
  onSettingsOpen
}) => {
  const [hierarchy, setHierarchy] = useState<TmuxHierarchy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [rawHierarchy, setRawHierarchy] = useState<any>(null);
  
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

  const loadHierarchy = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Loading tmux hierarchy...');
      const response = await tmuxAPI.getHierarchy();
      console.log('Raw hierarchy response:', response);
      
      setRawHierarchy(response.data);
      
      // The hierarchy should be directly in response.data
      const hierarchyData = response.data;
      console.log('Hierarchy data:', hierarchyData);
      
      if (hierarchyData && typeof hierarchyData === 'object') {
        // Convert the raw data to our expected format
        const formattedHierarchy: TmuxHierarchy = {
          sessions: hierarchyData
        };
        
        console.log('Formatted hierarchy:', formattedHierarchy);
        setHierarchy(formattedHierarchy);
      } else {
        throw new Error('Invalid hierarchy data format');
      }
    } catch (err) {
      console.error('Error loading hierarchy:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tmux hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHierarchy();
  }, []);

  const handleSessionChange = (session: string) => {
    onTargetChange(session);
  };

  const handleWindowChange = (window: string) => {
    if (window === '') {
      onTargetChange(currentTarget.session);
    } else {
      onTargetChange(buildTarget(currentTarget.session, window));
    }
  };

  const handlePaneChange = (pane: string) => {
    if (pane === '' || !currentTarget.window) {
      onTargetChange(buildTarget(currentTarget.session, currentTarget.window));
    } else {
      onTargetChange(buildTarget(currentTarget.session, currentTarget.window, pane));
    }
  };


  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const sessions = hierarchy?.sessions || {};
  const currentSession = sessions[currentTarget.session];
  const windows = currentSession?.windows || {};
  const currentWindow = currentTarget.window ? windows[currentTarget.window] : null;
  const panes = currentWindow?.panes || {};

  return (
    <Box>
      <Stack spacing={2}>
        {/* Control Buttons */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={loadHierarchy}
              disabled={disabled || loading}
              title="階層を更新"
              size="small"
            >
              {loading ? <CircularProgress size={16} /> : <Refresh />}
            </IconButton>

            <IconButton
              onClick={() => setShowDebug(!showDebug)}
              title="デバッグ情報を表示"
              color={showDebug ? "primary" : "default"}
              size="small"
            >
              <BugReport />
            </IconButton>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            {connectionStatus}
            {onSettingsOpen && (
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={onSettingsOpen}
                size="small"
              >
                設定
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Selectors - Horizontal Layout */}
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel size="small">セッション</InputLabel>
            <Select
              value={currentTarget.session}
              onChange={(e) => handleSessionChange(e.target.value)}
              disabled={disabled || loading}
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
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel size="small">ウィンドウ</InputLabel>
              <Select
                value={currentTarget.window || ''}
                onChange={(e) => handleWindowChange(e.target.value)}
                disabled={disabled || loading}
                label="ウィンドウ"
                size="small"
              >
                <MenuItem value="">
                  <em>全て</em>
                </MenuItem>
                {Object.values(windows).map((window) => (
                  <MenuItem key={window.index} value={window.index}>
                    {window.index}: {window.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Pane Selector */}
          {currentWindow && Object.keys(panes).length > 1 && (
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel size="small">ペイン</InputLabel>
              <Select
                value={currentTarget.pane || ''}
                onChange={(e) => handlePaneChange(e.target.value)}
                disabled={disabled || loading}
                label="ペイン"
                size="small"
              >
                <MenuItem value="">
                  <em>全て</em>
                </MenuItem>
                {Object.values(panes).map((pane) => (
                  <MenuItem key={pane.index} value={pane.index}>
                    {pane.index}: {pane.command}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>


        {/* Debug Information */}
        {showDebug && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">デバッグ情報</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">現在のターゲット解析:</Typography>
                  <Box component="pre" sx={{ fontSize: '12px', backgroundColor: 'grey.100', p: 1, borderRadius: 1 }}>
                    {JSON.stringify(currentTarget, null, 2)}
                  </Box>
                </Box>
                
                <Box>
                  <Typography variant="body2" fontWeight="bold">生の階層データ:</Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      fontSize: '11px', 
                      backgroundColor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(rawHierarchy, null, 2)}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" fontWeight="bold">フォーマット済み階層:</Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      fontSize: '11px', 
                      backgroundColor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      maxHeight: '300px',
                      overflow: 'auto'
                    }}
                  >
                    {JSON.stringify(hierarchy, null, 2)}
                  </Box>
                </Box>
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}
      </Stack>

    </Box>
  );
};

export default TmuxTargetSelector;
import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
  Typography
} from '@mui/material';
import { 
  Send, 
  KeyboardReturn, 
  ClearAll, 
  Refresh,
  PlayArrow,
  Stop,
  KeyboardArrowUp,
  KeyboardArrowDown,
  History
} from '@mui/icons-material';
import { useTmux } from '../hooks/useTmux';
import { useWebSocket } from '../hooks/useWebSocket';
import ConnectionStatus from './ConnectionStatus';
import TmuxTargetSelector from './TmuxTargetSelector';
import { tmuxAPI } from '../services/api';
import Convert from 'ansi-to-html';

const convert = new Convert();

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
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const outputRef = React.useRef<HTMLDivElement>(null);
  
  const { sendCommand, sendEnter, getOutput, isLoading, error } = useTmux();
  const { 
    lastMessage, 
    isConnected: wsConnected, 
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts,
    connect: wsConnect, 
    disconnect: wsDisconnect,
    setTarget: wsSetTarget,
    error: wsError 
  } = useWebSocket(selectedTarget);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  };

  // Handle command send
  const handleSendCommand = async () => {
    if (!command.trim()) return;
    
    try {
      await sendCommand(command, selectedTarget);
      setCommand('');
      // Refresh output after sending command
      setTimeout(() => handleRefresh(), 500);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendEnter = async () => {
    try {
      await sendEnter(selectedTarget);
      // Refresh output after sending enter
      setTimeout(() => handleRefresh(), 500);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleClear = async () => {
    try {
      await sendCommand('\x0c', selectedTarget);
      setTimeout(() => handleRefresh(), 500);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleArrowUp = async () => {
    try {
      await sendCommand('\x1b[A', selectedTarget); // ESC[A for up arrow
      setTimeout(() => handleRefresh(), 200);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleArrowDown = async () => {
    try {
      await sendCommand('\x1b[B', selectedTarget); // ESC[B for down arrow
      setTimeout(() => handleRefresh(), 200);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleRefresh = useCallback(async () => {
    try {
      const outputContent = await getOutput(selectedTarget);
      setOutput(outputContent);
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      // Error is handled by the hook
    }
  }, [getOutput, selectedTarget]);

  const handleShowHistory = async () => {
    try {
      const output = await tmuxAPI.getOutput(selectedTarget, true, 2000);
      setOutput(output.content);
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      console.error('Error getting history:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      handleSendCommand();
    }
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

  // Handle target change
  React.useEffect(() => {
    if (selectedTarget) {
      wsSetTarget(selectedTarget);
      setOutput('');
      if (isConnected) {
        handleRefresh();
      }
    }
  }, [selectedTarget, isConnected, wsSetTarget, handleRefresh]);

  // Handle WebSocket messages
  React.useEffect(() => {
    if (lastMessage && lastMessage.target === selectedTarget) {
      setOutput(lastMessage.content);
      setTimeout(scrollToBottom, 50);
    }
  }, [lastMessage, selectedTarget]);

  // Initial load and auto-refresh setup
  React.useEffect(() => {
    if (isConnected) {
      handleRefresh();
      if (autoRefresh && !wsConnected) {
        wsConnect();
      }
    }
  }, [isConnected, handleRefresh, autoRefresh, wsConnected, wsConnect]);

  // Handle autoRefresh state changes
  React.useEffect(() => {
    if (isConnected && autoRefresh && !wsConnected) {
      wsConnect();
    } else if (!autoRefresh && wsConnected) {
      wsDisconnect();
    }
  }, [autoRefresh, isConnected, wsConnected, wsConnect, wsDisconnect]);

  return (
    <Stack spacing={2} sx={{ height: '100vh', p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2 }}>
        {/* Target Selector */}
        <TmuxTargetSelector
          selectedTarget={selectedTarget}
          onTargetChange={onTargetChange}
          disabled={!isConnected || isLoading}
          connectionStatus={
            <ConnectionStatus 
              isConnected={isConnected && (!autoRefresh || wsConnected)} 
              isReconnecting={autoRefresh && isReconnecting}
              reconnectAttempts={reconnectAttempts}
              maxReconnectAttempts={maxReconnectAttempts}
            />
          }
          onSettingsOpen={onSettingsOpen}
        />
      </Paper>

      {/* Output Display */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Stack spacing={1} sx={{ p: 2, pb: 0 }}>
          {/* Output Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={handleRefresh}
                disabled={!isConnected || isLoading || autoRefresh}
                sx={{ minWidth: 'auto', px: 2 }}
                size="small"
              >
                {isLoading ? <CircularProgress size={16} /> : <Refresh />}
              </Button>
              
              <Button
                variant="outlined"
                onClick={handleShowHistory}
                disabled={!isConnected || isLoading}
                sx={{ minWidth: 'auto', px: 1 }}
                size="small"
                title="履歴を表示"
              >
                <History />
              </Button>
            </Stack>
            
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={handleAutoRefreshToggle}
                  disabled={!isConnected}
                  size="small"
                />
              }
              label={
                <Box display="flex" alignItems="center" gap={0.5}>
                  {autoRefresh ? <Stop fontSize="small" /> : <PlayArrow fontSize="small" />}
                  <Typography variant="body2">
                    リアルタイム
                    {autoRefresh && wsConnected && ' (接続中)'}
                  </Typography>
                </Box>
              }
            />
          </Stack>

          {/* Errors */}
          {error && <Alert severity="error" onClose={() => {}}>{error}</Alert>}
          {wsError && autoRefresh && <Alert severity="warning">WebSocket: {wsError}</Alert>}
        </Stack>

        {/* Output Content */}
        <Box
          ref={outputRef}
          sx={{
            flex: 1,
            overflow: 'auto',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: { xs: '10px', sm: '12px', md: '14px' },
            backgroundColor: '#000000',
            color: '#f0f0f0',
            p: 2,
            m: 2,
            mt: 1,
            borderRadius: 1,
            whiteSpace: 'pre',
            WebkitOverflowScrolling: 'touch',
            '& code': {
              fontFamily: 'inherit',
              fontSize: 'inherit',
              backgroundColor: 'transparent'
            }
          }}
        >
          {output ? (
            <div 
              dangerouslySetInnerHTML={{ 
                __html: convert.toHtml(output) 
              }} 
            />
          ) : (
            'tmux出力がここに表示されます...'
          )}
        </Box>
      </Paper>

      {/* Command Input */}
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={16} /> : <Send />}
                onClick={handleSendCommand}
                disabled={!isConnected || !command.trim() || isLoading}
                size="small"
              >
                送信
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<KeyboardReturn />}
                onClick={handleSendEnter}
                disabled={!isConnected || isLoading}
                size="small"
              >
                Enter
              </Button>
            </Stack>
            
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ClearAll />}
              onClick={handleClear}
              disabled={!isConnected || isLoading}
              size="small"
            >
              Clear
            </Button>
            
          </Stack>

          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              fullWidth
              label="コマンド (Shift+Enter: 送信, Enter: 改行)"
              placeholder="ls -la"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isConnected || isLoading}
              size="small"
              autoComplete="off"
              multiline
              rows={3}
            />
            
            <Stack spacing={0.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleArrowUp}
                disabled={!isConnected || isLoading}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                <KeyboardArrowUp />
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleArrowDown}
                disabled={!isConnected || isLoading}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                <KeyboardArrowDown />
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
};

export default UnifiedView;
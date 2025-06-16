import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Button,
  Stack,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress
} from '@mui/material';
import { Refresh, PlayArrow, Stop } from '@mui/icons-material';
import { useTmux } from '../hooks/useTmux';
import { useWebSocket } from '../hooks/useWebSocket';
import Convert from 'ansi-to-html';

const convert = new Convert();

interface TmuxDisplayTabProps {
  isConnected: boolean;
  selectedTarget: string;
}

const TmuxDisplayTab: React.FC<TmuxDisplayTabProps> = ({ isConnected, selectedTarget }) => {
  const [output, setOutput] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true); // デフォルトでリアルタイム更新ON
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const outputRef = useRef<HTMLPreElement>(null);
  
  const { getOutput, isLoading, error } = useTmux();
  const { 
    lastMessage, 
    isConnected: wsConnected, 
    connect: wsConnect, 
    disconnect: wsDisconnect,
    setTarget: wsSetTarget,
    error: wsError 
  } = useWebSocket(selectedTarget);

  // Scroll to bottom helper function
  const scrollToBottom = () => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    try {
      const outputContent = await getOutput(selectedTarget);
      setOutput(outputContent);
      setLastUpdate(new Date().toLocaleTimeString());
      
      // Scroll to bottom after content update
      setTimeout(scrollToBottom, 50);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  // Handle target change
  useEffect(() => {
    if (selectedTarget) {
      wsSetTarget(selectedTarget);
      // Clear output when switching targets
      setOutput('');
      // Refresh output for the new target if connected
      if (isConnected) {
        // Always get initial content when switching targets
        handleRefresh();
      }
    }
  }, [selectedTarget, isConnected]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.target === selectedTarget) {
      setOutput(lastMessage.content);
      setLastUpdate(new Date(lastMessage.timestamp).toLocaleTimeString());
      
      // Auto-scroll to bottom
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    }
  }, [lastMessage, selectedTarget]);

  // Handle auto-refresh toggle
  const handleAutoRefreshToggle = () => {
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
    
    if (newAutoRefresh) {
      // Start auto-refresh (WebSocket)
      wsConnect();
    } else {
      // Stop auto-refresh
      wsDisconnect();
    }
  };

  // Initial load and auto-refresh setup
  useEffect(() => {
    if (isConnected) {
      // Always get initial content when connected
      handleRefresh();
      
      // Start WebSocket if auto-refresh is enabled
      if (autoRefresh && !wsConnected) {
        wsConnect();
      }
    }
  }, [isConnected]);

  // Handle autoRefresh state changes
  useEffect(() => {
    if (isConnected && autoRefresh && !wsConnected) {
      wsConnect();
    } else if (!autoRefresh && wsConnected) {
      wsDisconnect();
    }
  }, [autoRefresh, isConnected, wsConnected]);

  // Scroll to bottom whenever output changes
  useEffect(() => {
    if (output) {
      setTimeout(scrollToBottom, 50);
    }
  }, [output]);

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 }, height: '80vh', display: 'flex', flexDirection: 'column' }}>
      <Stack spacing={2} sx={{ flex: '0 0 auto' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {selectedTarget}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {lastUpdate && lastUpdate}
          </Typography>
        </Box>

        {/* Error Alerts */}
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}
        
        {wsError && autoRefresh && (
          <Alert severity="warning">
            WebSocket接続エラー: {wsError}
          </Alert>
        )}

        {/* Controls */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            onClick={handleRefresh}
            disabled={!isConnected || isLoading || autoRefresh}
            sx={{ minWidth: 'auto', px: 2 }}
          >
            {isLoading ? <CircularProgress size={20} /> : <Refresh />}
          </Button>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={handleAutoRefreshToggle}
                disabled={!isConnected}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                {autoRefresh ? <Stop fontSize="small" /> : <PlayArrow fontSize="small" />}
                リアルタイム更新
                {autoRefresh && wsConnected && (
                  <Typography variant="caption" color="success.main">
                    (接続中)
                  </Typography>
                )}
              </Box>
            }
          />
        </Stack>
      </Stack>

      {/* Output Display */}
      <Box
        ref={outputRef}
        sx={{
          flex: '1 1 auto',
          mt: 2,
          overflow: 'auto',
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          fontSize: { xs: '10px', sm: '12px', md: '14px' },
          backgroundColor: '#000000',
          color: '#f0f0f0',
          p: 2,
          m: 0,
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
  );
};

export default TmuxDisplayTab;
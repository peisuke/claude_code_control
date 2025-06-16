import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Stack,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { Send, KeyboardReturn, Settings, ClearAll, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
import { useTmux } from '../hooks/useTmux';
import ConnectionStatus from './ConnectionStatus';
import TmuxTargetSelector from './TmuxTargetSelector';

interface CommandTabProps {
  isConnected: boolean;
  onSettingsOpen: () => void;
  selectedTarget: string;
  onTargetChange: (target: string) => void;
}

const CommandTab: React.FC<CommandTabProps> = ({ 
  isConnected, 
  onSettingsOpen,
  selectedTarget,
  onTargetChange
}) => {
  const [command, setCommand] = useState('');
  const { sendCommand, sendEnter, isLoading, error } = useTmux();

  const handleSendCommand = async () => {
    if (!command.trim()) return;
    
    try {
      await sendCommand(command, selectedTarget);
      setCommand(''); // Clear command after successful send
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleSendEnter = async () => {
    try {
      await sendEnter(selectedTarget);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleClear = async () => {
    try {
      // Send Ctrl+L to clear the screen
      await sendCommand('\x0c', selectedTarget);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleArrowUp = async () => {
    try {
      await sendCommand('\x1b[A', selectedTarget); // ESC[A for up arrow
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleArrowDown = async () => {
    try {
      await sendCommand('\x1b[B', selectedTarget); // ESC[B for down arrow
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      handleSendCommand();
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="flex-end">
          <ConnectionStatus isConnected={isConnected} />
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={onSettingsOpen}
            size="small"
          >
            設定
          </Button>
        </Stack>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => {}}>
            {error}
          </Alert>
        )}

        {/* Target Selector */}
        <TmuxTargetSelector
          selectedTarget={selectedTarget}
          onTargetChange={onTargetChange}
          disabled={!isConnected || isLoading}
        />

        {/* Command Input */}
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            fullWidth
            label="コマンド (Shift+Enter: 送信, Enter: 改行)"
            placeholder="ls -la"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={!isConnected || isLoading}
            multiline
            rows={2}
            size="small"
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

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={16} /> : <Send />}
              onClick={handleSendCommand}
              disabled={!isConnected || !command.trim() || isLoading}
            >
              送信
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<KeyboardReturn />}
              onClick={handleSendEnter}
              disabled={!isConnected || isLoading}
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
          >
            Clear
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default CommandTab;
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
import { Send, KeyboardReturn, Settings } from '@mui/icons-material';
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

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
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
        <TextField
          fullWidth
          label="コマンド"
          placeholder="ls -la"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!isConnected || isLoading}
          multiline
          rows={2}
          size="small"
        />

        {/* Action Buttons */}
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
      </Stack>
    </Paper>
  );
};

export default CommandTab;
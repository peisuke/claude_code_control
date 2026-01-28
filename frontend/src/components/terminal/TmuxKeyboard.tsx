import React from 'react';
import { Stack, Button } from '@mui/material';
import {
  ExitToApp,
  Search,
  KeyboardTab,
  ClearAll
} from '@mui/icons-material';
import { KEYBOARD_COMMANDS, KEYBOARD_DESCRIPTIONS, KEYBOARD_LABELS } from '../../constants/keyboard';

interface TmuxKeyboardProps {
  isConnected: boolean;
  isLoading: boolean;
  onSendCommand: (command: string) => Promise<void>;
}

const TmuxKeyboard: React.FC<TmuxKeyboardProps> = ({
  isConnected,
  isLoading,
  onSendCommand
}) => {
  const handleKeyCommand = async (command: string) => {
    await onSendCommand(command);
  };

  const disabled = !isConnected || isLoading;

  return (
    <>
      {/* Bottom control for tmux output - matches original layout */}
      <Stack direction="row" justifyContent="space-between" sx={{ p: 1, pt: 0 }}>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleKeyCommand(KEYBOARD_COMMANDS.CTRL_O)}
            disabled={disabled}
            sx={{ minWidth: 'auto', px: 1 }}
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.CTRL_O]}
          >
            <Search fontSize="small" sx={{ mr: 0.5 }} />
            {KEYBOARD_LABELS[KEYBOARD_COMMANDS.CTRL_O]}
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleKeyCommand(KEYBOARD_COMMANDS.SHIFT_TAB)}
            disabled={disabled}
            sx={{ minWidth: 'auto', px: 1 }}
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.SHIFT_TAB]}
          >
            <KeyboardTab fontSize="small" sx={{ mr: 0.5, transform: 'rotate(180deg)' }} />
            {KEYBOARD_LABELS[KEYBOARD_COMMANDS.SHIFT_TAB]}
          </Button>
        </Stack>
        
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleKeyCommand(KEYBOARD_COMMANDS.ESCAPE)}
            disabled={disabled}
            sx={{ minWidth: 'auto', px: 1 }}
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.ESCAPE]}
          >
            <ExitToApp fontSize="small" sx={{ mr: 0.5 }} />
            {KEYBOARD_LABELS[KEYBOARD_COMMANDS.ESCAPE]}
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleKeyCommand(KEYBOARD_COMMANDS.CTRL_C)}
            disabled={disabled}
            sx={{ minWidth: 'auto', px: 1 }}
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.CTRL_C]}
          >
            <ClearAll fontSize="small" sx={{ mr: 0.5 }} />
            {KEYBOARD_LABELS[KEYBOARD_COMMANDS.CTRL_C]}
          </Button>
        </Stack>
      </Stack>
    </>
  );
};

export default TmuxKeyboard;
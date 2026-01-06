import React from 'react';
import { Stack, TextField, Button, CircularProgress } from '@mui/material';
import { Send, KeyboardReturn, Fullscreen, FullscreenExit, Delete, ClearAll, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
import { LAYOUT, LABELS } from '../../constants/ui';
import { KEYBOARD_COMMANDS, KEYBOARD_DESCRIPTIONS, KEYBOARD_LABELS } from '../../constants/keyboard';
import { TmuxUtils } from '../../utils/tmux';

interface CommandInputAreaProps {
  command: string;
  onCommandChange: (command: string) => void;
  onSendCommand: () => Promise<void>;
  onSendEnter: () => Promise<void>;
  onSendKeyboardCommand: (command: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const CommandInputArea: React.FC<CommandInputAreaProps> = ({
  command,
  onCommandChange,
  onSendCommand,
  onSendEnter,
  onSendKeyboardCommand,
  isConnected,
  isLoading,
  isExpanded,
  onToggleExpanded
}) => {
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault();
      onSendCommand();
    }
  };

  const canSendCommand = isConnected && TmuxUtils.isValidCommand(command) && !isLoading;
  const disabled = !isConnected || isLoading;

  return (
    <Stack spacing={2} sx={isExpanded ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}}>
      {/* Command Buttons */}
      <Stack direction="row" spacing={2} justifyContent="space-between">
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} /> : <Send />}
            onClick={onSendCommand}
            disabled={!canSendCommand}
            size="small"
          >
            {LABELS.BUTTONS.SEND}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<KeyboardReturn />}
            onClick={onSendEnter}
            disabled={disabled}
            size="small"
          >
            {LABELS.BUTTONS.ENTER}
          </Button>
        </Stack>
        
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Delete />}
            onClick={() => onSendKeyboardCommand(KEYBOARD_COMMANDS.BACKSPACE)}
            disabled={disabled}
            size="small"
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.BACKSPACE]}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            {KEYBOARD_LABELS[KEYBOARD_COMMANDS.BACKSPACE]}
          </Button>
          
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ClearAll />}
            onClick={() => onSendKeyboardCommand(KEYBOARD_COMMANDS.CLEAR_SCREEN)}
            disabled={disabled}
            size="small"
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.CLEAR_SCREEN]}
            sx={{ minWidth: 'auto', px: 1 }}
          >
            {KEYBOARD_LABELS[KEYBOARD_COMMANDS.CLEAR_SCREEN]}
          </Button>
        </Stack>
      </Stack>

      {/* Command Input */}
      <Stack direction="row" spacing={1} alignItems="flex-start" sx={isExpanded ? { flex: 1, minHeight: 0 } : {}}>
        <TextField
          fullWidth
          label="コマンド (Shift+Enter: 送信, Enter: 改行)"
          placeholder={LABELS.PLACEHOLDERS.COMMAND_INPUT}
          value={command}
          onChange={(e) => onCommandChange(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={disabled}
          size="small"
          autoComplete="off"
          multiline
          {...(!isExpanded && { rows: LAYOUT.COMMAND_INPUT_MIN_ROWS })}
          sx={isExpanded ? {
            flex: 1,
            minHeight: 0,
            '& .MuiInputBase-root': {
              height: '100%',
              alignItems: 'flex-start'
            },
            '& .MuiInputBase-input': {
              height: '100% !important',
              overflow: 'auto !important'
            }
          } : {}}
        />
        
        <Stack spacing={0.5}>
          <Button
            variant="outlined"
            size="small"
            onClick={onToggleExpanded}
            disabled={disabled}
            sx={{ minWidth: 'auto', px: 1 }}
            title={isExpanded ? LABELS.BUTTONS.COLLAPSE_COMMAND : LABELS.BUTTONS.EXPAND_COMMAND}
          >
            {isExpanded ? <FullscreenExit /> : <Fullscreen />}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onSendKeyboardCommand(KEYBOARD_COMMANDS.ARROW_UP)}
            disabled={disabled}
            sx={{ minWidth: 'auto', px: 1 }}
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.ARROW_UP]}
          >
            <KeyboardArrowUp />
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onSendKeyboardCommand(KEYBOARD_COMMANDS.ARROW_DOWN)}
            disabled={disabled}
            sx={{ minWidth: 'auto', px: 1 }}
            title={KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.ARROW_DOWN]}
          >
            <KeyboardArrowDown />
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default CommandInputArea;
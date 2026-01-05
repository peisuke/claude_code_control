import React from 'react';
import { Button, Stack } from '@mui/material';
import { Folder, Terminal } from '@mui/icons-material';
import { ViewModeSwitchProps } from '../../types/controlPanel';
import { VIEW_MODES, LABELS } from '../../constants/ui';

/**
 * View mode toggle component
 * Single Responsibility: View mode switching only
 */
const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({
  viewMode,
  onViewModeToggle
}) => {
  const isFileMode = viewMode === VIEW_MODES.FILE;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button
        variant={isFileMode ? "outlined" : "contained"}
        onClick={onViewModeToggle}
        startIcon={<Terminal />}
        size="small"
        sx={{ 
          minWidth: '80px',
          bgcolor: !isFileMode ? 'primary.main' : 'transparent',
          color: !isFileMode ? 'primary.contrastText' : 'text.primary'
        }}
      >
        {LABELS.BUTTONS.TMUX_MODE}
      </Button>
      
      <Button
        variant={isFileMode ? "contained" : "outlined"}
        onClick={onViewModeToggle}
        startIcon={<Folder />}
        size="small"
        sx={{ 
          minWidth: '80px',
          bgcolor: isFileMode ? 'primary.main' : 'transparent',
          color: isFileMode ? 'primary.contrastText' : 'text.primary'
        }}
      >
        {LABELS.BUTTONS.FILE_MODE}
      </Button>
    </Stack>
  );
};

export default ViewModeSwitch;
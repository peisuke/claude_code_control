import React from 'react';
import { 
  Button, 
  Switch, 
  FormControlLabel, 
  Stack, 
  CircularProgress 
} from '@mui/material';
import { Refresh, PlayArrow, Stop } from '@mui/icons-material';
import { RefreshControlProps } from '../../types/controlPanel';
import { LABELS } from '../../constants/ui';

/**
 * Refresh controls component
 * Single Responsibility: Refresh functionality only
 */
const RefreshControls: React.FC<RefreshControlProps> = ({
  autoRefresh,
  onAutoRefreshToggle,
  isLoading,
  onRefresh
}) => {
  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Button
        variant="contained"
        onClick={onRefresh}
        disabled={isLoading || autoRefresh}
        sx={{ minWidth: 'auto', px: 2 }}
        size="small"
        title={LABELS.TOOLTIPS.MANUAL_REFRESH}
      >
        {isLoading ? <CircularProgress size={16} /> : <Refresh />}
      </Button>
      
      <FormControlLabel
        control={
          <Switch
            checked={autoRefresh}
            onChange={onAutoRefreshToggle}
            size="small"
            color="primary"
          />
        }
        label={
          <Stack direction="row" spacing={0.5} alignItems="center">
            {autoRefresh ? <PlayArrow fontSize="small" /> : <Stop fontSize="small" />}
            {LABELS.AUTO_REFRESH}
          </Stack>
        }
        sx={{ 
          m: 0,
          '& .MuiFormControlLabel-label': {
            fontSize: '0.875rem'
          }
        }}
      />
    </Stack>
  );
};

export default RefreshControls;
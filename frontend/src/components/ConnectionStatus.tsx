import React from 'react';
import { Chip, IconButton, Stack } from '@mui/material';
import { Circle, Sync, Refresh } from '@mui/icons-material';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  onReconnect?: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  isReconnecting = false, 
  reconnectAttempts = 0, 
  maxReconnectAttempts = 0,
  onReconnect
}) => {
  const getStatusInfo = () => {
    if (isConnected) {
      return {
        icon: <Circle />,
        label: '接続中',
        color: 'success' as const
      };
    } else if (isReconnecting) {
      return {
        icon: <Sync sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />,
        label: `再接続中 (${reconnectAttempts}/${maxReconnectAttempts})`,
        color: 'warning' as const
      };
    } else {
      return {
        icon: <Circle />,
        label: '切断',
        color: 'error' as const
      };
    }
  };

  const { icon, label, color } = getStatusInfo();
  const showReconnectButton = !isConnected && !isReconnecting && onReconnect;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Chip
        icon={icon}
        label={label}
        color={color}
        variant="outlined"
        size="small"
      />
      {showReconnectButton && (
        <IconButton
          size="small"
          onClick={onReconnect}
          title="手動再接続"
          sx={{ p: 0.5 }}
        >
          <Refresh fontSize="small" />
        </IconButton>
      )}
    </Stack>
  );
};

export default ConnectionStatus;
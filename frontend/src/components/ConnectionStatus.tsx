import React from 'react';
import { Chip } from '@mui/material';
import { Circle, Sync } from '@mui/icons-material';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  isReconnecting = false, 
  reconnectAttempts = 0, 
  maxReconnectAttempts = 0 
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

  return (
    <Chip
      icon={icon}
      label={label}
      color={color}
      variant="outlined"
      size="small"
    />
  );
};

export default ConnectionStatus;
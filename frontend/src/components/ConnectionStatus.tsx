import React from 'react';
import { Chip } from '@mui/material';
import { Circle } from '@mui/icons-material';

interface ConnectionStatusProps {
  isConnected: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  return (
    <Chip
      icon={<Circle />}
      label={isConnected ? '接続中' : '切断'}
      color={isConnected ? 'success' : 'error'}
      variant="outlined"
      size="small"
    />
  );
};

export default ConnectionStatus;
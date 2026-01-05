import React from 'react';
import { Chip, IconButton, Stack, Tooltip } from '@mui/material';
import { Circle, Sync, Refresh, WifiOff, Warning } from '@mui/icons-material';

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  isOnline?: boolean;
  onReconnect?: () => void;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  isReconnecting = false, 
  reconnectAttempts = 0, 
  maxReconnectAttempts = 0,
  isOnline = true,
  onReconnect
}) => {
  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: <WifiOff />,
        label: 'オフライン',
        color: 'error' as const,
        tooltip: 'ネットワーク接続がありません。接続を確認してください。'
      };
    } else if (isConnected) {
      return {
        icon: <Circle />,
        label: '接続中',
        color: 'success' as const,
        tooltip: 'サーバーと正常に接続されています'
      };
    } else if (isReconnecting) {
      const displayMax = maxReconnectAttempts > 900 ? '∞' : maxReconnectAttempts.toString();
      return {
        icon: <Sync sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />,
        label: `再接続中 (${reconnectAttempts}/${displayMax})`,
        color: 'warning' as const,
        tooltip: 'サーバーへの再接続を試行中です...'
      };
    } else {
      return {
        icon: <Warning />,
        label: '切断',
        color: 'error' as const,
        tooltip: 'サーバーとの接続が切断されています。手動で再接続してください。'
      };
    }
  };

  const { icon, label, color, tooltip } = getStatusInfo();
  const showReconnectButton = !isConnected && !isReconnecting && onReconnect && isOnline;

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Tooltip title={tooltip} arrow>
        <Chip
          icon={icon}
          label={label}
          color={color}
          variant="outlined"
          size="small"
          sx={{
            animation: isReconnecting ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.7 },
              '100%': { opacity: 1 }
            }
          }}
        />
      </Tooltip>
      {showReconnectButton && (
        <Tooltip title="手動で再接続を試行" arrow>
          <IconButton
            size="small"
            onClick={onReconnect}
            sx={{ 
              p: 0.5,
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'rotate(180deg)',
                transition: 'transform 0.3s'
              }
            }}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
};

export default ConnectionStatus;
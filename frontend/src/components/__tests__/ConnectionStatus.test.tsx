import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionStatus from '../ConnectionStatus';

describe('ConnectionStatus', () => {
  describe('connected state', () => {
    it('should display connected status when isConnected is true', () => {
      render(<ConnectionStatus isConnected={true} />);

      expect(screen.getByText('接続中')).toBeInTheDocument();
    });

    it('should display connected status with wsConnected true', () => {
      render(<ConnectionStatus isConnected={true} wsConnected={true} />);

      expect(screen.getByText('接続中')).toBeInTheDocument();
    });

    it('should use success color when connected', () => {
      render(<ConnectionStatus isConnected={true} />);

      const chip = screen.getByText('接続中').closest('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorSuccess');
    });
  });

  describe('disconnected state', () => {
    it('should display disconnected status when isConnected is false', () => {
      render(<ConnectionStatus isConnected={false} />);

      expect(screen.getByText('切断')).toBeInTheDocument();
    });

    it('should use error color when disconnected', () => {
      render(<ConnectionStatus isConnected={false} />);

      const chip = screen.getByText('切断').closest('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorError');
    });
  });

  describe('websocket disconnected state', () => {
    it('should display WS disconnect when wsConnected is false but isConnected is true', () => {
      render(<ConnectionStatus isConnected={true} wsConnected={false} />);

      expect(screen.getByText('WS切断')).toBeInTheDocument();
    });

    it('should use warning color for WS disconnect', () => {
      render(<ConnectionStatus isConnected={true} wsConnected={false} />);

      const chip = screen.getByText('WS切断').closest('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorWarning');
    });
  });

  describe('offline state', () => {
    it('should display offline status when isOnline is false', () => {
      render(<ConnectionStatus isConnected={false} isOnline={false} />);

      expect(screen.getByText('オフライン')).toBeInTheDocument();
    });

    it('should use error color when offline', () => {
      render(<ConnectionStatus isConnected={false} isOnline={false} />);

      const chip = screen.getByText('オフライン').closest('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorError');
    });

    it('should prioritize offline over other states', () => {
      render(<ConnectionStatus isConnected={true} wsConnected={true} isOnline={false} />);

      expect(screen.getByText('オフライン')).toBeInTheDocument();
    });
  });

  describe('reconnecting state', () => {
    it('should display reconnecting status with attempt count', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          isReconnecting={true}
          reconnectAttempts={3}
          maxReconnectAttempts={10}
        />
      );

      expect(screen.getByText('再接続中 (3/10)')).toBeInTheDocument();
    });

    it('should display infinity symbol for unlimited reconnect attempts', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          isReconnecting={true}
          reconnectAttempts={5}
          maxReconnectAttempts={999}
        />
      );

      expect(screen.getByText('再接続中 (5/∞)')).toBeInTheDocument();
    });

    it('should use warning color when reconnecting', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          isReconnecting={true}
        />
      );

      const chip = screen.getByText(/再接続中/).closest('.MuiChip-root');
      expect(chip).toHaveClass('MuiChip-colorWarning');
    });
  });

  describe('reconnect button', () => {
    it('should show reconnect button when disconnected and onReconnect provided', () => {
      const onReconnect = jest.fn();
      render(
        <ConnectionStatus
          isConnected={false}
          onReconnect={onReconnect}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should not show reconnect button when connected', () => {
      const onReconnect = jest.fn();
      render(
        <ConnectionStatus
          isConnected={true}
          onReconnect={onReconnect}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not show reconnect button when reconnecting', () => {
      const onReconnect = jest.fn();
      render(
        <ConnectionStatus
          isConnected={false}
          isReconnecting={true}
          onReconnect={onReconnect}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should not show reconnect button when offline', () => {
      const onReconnect = jest.fn();
      render(
        <ConnectionStatus
          isConnected={false}
          isOnline={false}
          onReconnect={onReconnect}
        />
      );

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onReconnect when button clicked', () => {
      const onReconnect = jest.fn();
      render(
        <ConnectionStatus
          isConnected={false}
          onReconnect={onReconnect}
        />
      );

      fireEvent.click(screen.getByRole('button'));
      expect(onReconnect).toHaveBeenCalledTimes(1);
    });

    it('should show reconnect button when wsConnected is false', () => {
      const onReconnect = jest.fn();
      render(
        <ConnectionStatus
          isConnected={true}
          wsConnected={false}
          onReconnect={onReconnect}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should render with error prop', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          error="Connection timeout"
        />
      );

      expect(screen.getByText('切断')).toBeInTheDocument();
    });

    it('should render with wsError prop', () => {
      render(
        <ConnectionStatus
          isConnected={false}
          wsError="WebSocket error"
        />
      );

      expect(screen.getByText('切断')).toBeInTheDocument();
    });
  });

  describe('default props', () => {
    it('should use default values for optional props', () => {
      render(<ConnectionStatus isConnected={true} />);

      expect(screen.getByText('接続中')).toBeInTheDocument();
    });

    it('should handle missing onReconnect gracefully', () => {
      render(<ConnectionStatus isConnected={false} />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});

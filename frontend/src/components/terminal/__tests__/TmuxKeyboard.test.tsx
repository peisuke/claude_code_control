import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TmuxKeyboard from '../TmuxKeyboard';

// Keyboard command constants
const KEYBOARD_COMMANDS = {
  ESCAPE: '\x1b',
  CTRL_C: '\x03',
  CTRL_O: '\x0f',
  SHIFT_TAB: '\x1b[Z',
};

describe('TmuxKeyboard', () => {
  const defaultProps = {
    isConnected: true,
    isLoading: false,
    onSendCommand: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render Ctrl+O button', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      expect(screen.getByText('Ctrl+O')).toBeInTheDocument();
    });

    it('should render Shift+Tab button', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      expect(screen.getByText('⇧+Tab')).toBeInTheDocument();
    });

    it('should render ESC button', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      expect(screen.getByText('ESC')).toBeInTheDocument();
    });

    it('should render Ctrl+C button', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      expect(screen.getByText('Ctrl+C')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call onSendCommand with Ctrl+O command', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      fireEvent.click(screen.getByText('Ctrl+O'));

      expect(defaultProps.onSendCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.CTRL_O);
    });

    it('should call onSendCommand with Shift+Tab command', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      fireEvent.click(screen.getByText('⇧+Tab'));

      expect(defaultProps.onSendCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.SHIFT_TAB);
    });

    it('should call onSendCommand with ESC command', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      fireEvent.click(screen.getByText('ESC'));

      expect(defaultProps.onSendCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.ESCAPE);
    });

    it('should call onSendCommand with Ctrl+C command', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      fireEvent.click(screen.getByText('Ctrl+C'));

      expect(defaultProps.onSendCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.CTRL_C);
    });
  });

  describe('disabled state', () => {
    it('should disable all buttons when not connected', () => {
      render(<TmuxKeyboard {...defaultProps} isConnected={false} />);

      expect(screen.getByText('Ctrl+O')).toBeDisabled();
      expect(screen.getByText('⇧+Tab')).toBeDisabled();
      expect(screen.getByText('ESC')).toBeDisabled();
      expect(screen.getByText('Ctrl+C')).toBeDisabled();
    });

    it('should disable all buttons when loading', () => {
      render(<TmuxKeyboard {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Ctrl+O')).toBeDisabled();
      expect(screen.getByText('⇧+Tab')).toBeDisabled();
      expect(screen.getByText('ESC')).toBeDisabled();
      expect(screen.getByText('Ctrl+C')).toBeDisabled();
    });

    it('should enable all buttons when connected and not loading', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      expect(screen.getByText('Ctrl+O')).not.toBeDisabled();
      expect(screen.getByText('⇧+Tab')).not.toBeDisabled();
      expect(screen.getByText('ESC')).not.toBeDisabled();
      expect(screen.getByText('Ctrl+C')).not.toBeDisabled();
    });
  });

  describe('button titles', () => {
    it('should have descriptive titles for accessibility', () => {
      render(<TmuxKeyboard {...defaultProps} />);

      expect(screen.getByTitle('履歴展開')).toBeInTheDocument(); // Ctrl+O
      expect(screen.getByTitle('前方移動')).toBeInTheDocument(); // Shift+Tab
      expect(screen.getByTitle('ESCキーを送信')).toBeInTheDocument(); // ESC
      expect(screen.getByTitle('プロセス終了')).toBeInTheDocument(); // Ctrl+C
    });
  });
});

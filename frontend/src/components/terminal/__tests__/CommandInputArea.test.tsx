import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CommandInputArea from '../CommandInputArea';

// Keyboard command constants
const KEYBOARD_COMMANDS = {
  CLEAR_SCREEN: '\x0c',
  BACKSPACE: '\x7f',
  ARROW_UP: '\x1b[A',
  ARROW_DOWN: '\x1b[B',
};

describe('CommandInputArea', () => {
  const defaultProps = {
    command: '',
    onCommandChange: jest.fn(),
    onSendCommand: jest.fn().mockResolvedValue(undefined),
    onSendEnter: jest.fn().mockResolvedValue(undefined),
    onSendKeyboardCommand: jest.fn().mockResolvedValue(undefined),
    isConnected: true,
    isLoading: false,
    isExpanded: false,
    onToggleExpanded: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render command input field', () => {
      render(<CommandInputArea {...defaultProps} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render send button', () => {
      render(<CommandInputArea {...defaultProps} />);

      expect(screen.getByText('送信')).toBeInTheDocument();
    });

    it('should render enter button', () => {
      render(<CommandInputArea {...defaultProps} />);

      expect(screen.getByText('Enter')).toBeInTheDocument();
    });

    it('should render backspace button', () => {
      render(<CommandInputArea {...defaultProps} />);

      expect(screen.getByText('Del')).toBeInTheDocument();
    });

    it('should render clear button', () => {
      render(<CommandInputArea {...defaultProps} />);

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  describe('command input', () => {
    it('should display command value', () => {
      render(<CommandInputArea {...defaultProps} command="ls -la" />);

      expect(screen.getByRole('textbox')).toHaveValue('ls -la');
    });

    it('should call onCommandChange when typing', () => {
      render(<CommandInputArea {...defaultProps} />);

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'echo hello' } });

      expect(defaultProps.onCommandChange).toHaveBeenCalledWith('echo hello');
    });

    it('should call onSendCommand on Shift+Enter', () => {
      render(<CommandInputArea {...defaultProps} command="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(defaultProps.onSendCommand).toHaveBeenCalledTimes(1);
    });

    it('should not call onSendCommand on Enter without Shift', () => {
      render(<CommandInputArea {...defaultProps} command="test" />);

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      expect(defaultProps.onSendCommand).not.toHaveBeenCalled();
    });
  });

  describe('button interactions', () => {
    it('should call onSendCommand when send button clicked', () => {
      render(<CommandInputArea {...defaultProps} command="test command" />);

      fireEvent.click(screen.getByText('送信'));

      expect(defaultProps.onSendCommand).toHaveBeenCalledTimes(1);
    });

    it('should call onSendEnter when enter button clicked', () => {
      render(<CommandInputArea {...defaultProps} />);

      fireEvent.click(screen.getByText('Enter'));

      expect(defaultProps.onSendEnter).toHaveBeenCalledTimes(1);
    });

    it('should call onSendKeyboardCommand with backspace', () => {
      render(<CommandInputArea {...defaultProps} />);

      fireEvent.click(screen.getByText('Del'));

      expect(defaultProps.onSendKeyboardCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.BACKSPACE);
    });

    it('should call onSendKeyboardCommand with clear screen', () => {
      render(<CommandInputArea {...defaultProps} />);

      fireEvent.click(screen.getByText('Clear'));

      expect(defaultProps.onSendKeyboardCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.CLEAR_SCREEN);
    });

    it('should call onToggleExpanded when expand button clicked', () => {
      render(<CommandInputArea {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const expandButton = buttons.find(btn => btn.querySelector('[data-testid="FullscreenIcon"]'));
      expect(expandButton).toBeDefined();
      fireEvent.click(expandButton!);

      expect(defaultProps.onToggleExpanded).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled state', () => {
    it('should disable all controls when not connected', () => {
      render(<CommandInputArea {...defaultProps} isConnected={false} />);

      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByText('Enter')).toBeDisabled();
      expect(screen.getByText('Del')).toBeDisabled();
      expect(screen.getByText('Clear')).toBeDisabled();
    });

    it('should disable all controls when loading', () => {
      render(<CommandInputArea {...defaultProps} isLoading={true} />);

      expect(screen.getByRole('textbox')).toBeDisabled();
      expect(screen.getByText('Enter')).toBeDisabled();
    });

    it('should disable send button when command is empty', () => {
      render(<CommandInputArea {...defaultProps} command="" />);

      expect(screen.getByText('送信')).toBeDisabled();
    });

    it('should disable send button when command is whitespace only', () => {
      render(<CommandInputArea {...defaultProps} command="   " />);

      expect(screen.getByText('送信')).toBeDisabled();
    });

    it('should enable send button when command has content', () => {
      render(<CommandInputArea {...defaultProps} command="valid command" />);

      expect(screen.getByText('送信')).not.toBeDisabled();
    });
  });

  describe('loading state', () => {
    it('should show loading spinner in send button when loading', () => {
      render(<CommandInputArea {...defaultProps} isLoading={true} command="test" />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('should render in expanded mode', () => {
      render(<CommandInputArea {...defaultProps} isExpanded={true} />);

      // Component should render without error in expanded mode
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render in collapsed mode', () => {
      render(<CommandInputArea {...defaultProps} isExpanded={false} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  describe('arrow key buttons', () => {
    it('should call onSendKeyboardCommand with arrow up', () => {
      render(<CommandInputArea {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const arrowUpButton = buttons.find(btn => btn.querySelector('[data-testid="KeyboardArrowUpIcon"]'));
      expect(arrowUpButton).toBeDefined();
      fireEvent.click(arrowUpButton!);
      expect(defaultProps.onSendKeyboardCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.ARROW_UP);
    });

    it('should call onSendKeyboardCommand with arrow down', () => {
      render(<CommandInputArea {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      const arrowDownButton = buttons.find(btn => btn.querySelector('[data-testid="KeyboardArrowDownIcon"]'));
      expect(arrowDownButton).toBeDefined();
      fireEvent.click(arrowDownButton!);
      expect(defaultProps.onSendKeyboardCommand).toHaveBeenCalledWith(KEYBOARD_COMMANDS.ARROW_DOWN);
    });
  });
});

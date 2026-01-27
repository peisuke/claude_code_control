import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TmuxViewContainer from '../TmuxViewContainer';

// Mock child components
jest.mock('../../terminal/TerminalOutput', () => {
  return function MockTerminalOutput({ output }: { output: string }) {
    return <div data-testid="terminal-output">{output || 'placeholder'}</div>;
  };
});

jest.mock('../../terminal/CommandInputArea', () => {
  return function MockCommandInputArea({
    command,
    isExpanded
  }: {
    command: string;
    isExpanded: boolean;
  }) {
    return (
      <div data-testid="command-input">
        <span>command: {command}</span>
        <span>expanded: {isExpanded ? 'true' : 'false'}</span>
      </div>
    );
  };
});

jest.mock('../../terminal/TmuxKeyboard', () => {
  return function MockTmuxKeyboard({
    isConnected,
    isLoading
  }: {
    isConnected: boolean;
    isLoading: boolean;
  }) {
    return (
      <div data-testid="tmux-keyboard">
        <span>connected: {isConnected ? 'true' : 'false'}</span>
        <span>loading: {isLoading ? 'true' : 'false'}</span>
      </div>
    );
  };
});

jest.mock('../../../hooks/useScrollBasedOutput', () => ({
  useScrollBasedOutput: () => ({
    output: 'scroll output',
    isLoadingHistory: false,
    handleScroll: jest.fn(),
    setOutput: jest.fn(),
    outputRef: { current: null }
  })
}));

describe('TmuxViewContainer', () => {
  const defaultProps = {
    output: 'test output',
    isConnected: true,
    commandExpanded: false,
    command: 'ls -la',
    onCommandChange: jest.fn(),
    onSendCommand: jest.fn().mockResolvedValue(undefined),
    onSendEnter: jest.fn().mockResolvedValue(undefined),
    onSendKeyboardCommand: jest.fn().mockResolvedValue(undefined),
    onToggleExpanded: jest.fn(),
    isLoading: false,
    selectedTarget: 'default'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render terminal output component', () => {
      render(<TmuxViewContainer {...defaultProps} />);

      expect(screen.getByTestId('terminal-output')).toBeInTheDocument();
    });

    it('should render command input component', () => {
      render(<TmuxViewContainer {...defaultProps} />);

      expect(screen.getByTestId('command-input')).toBeInTheDocument();
    });

    it('should render tmux keyboard component', () => {
      render(<TmuxViewContainer {...defaultProps} />);

      expect(screen.getByTestId('tmux-keyboard')).toBeInTheDocument();
    });
  });

  describe('props passing', () => {
    it('should pass command to CommandInputArea', () => {
      render(<TmuxViewContainer {...defaultProps} command="echo hello" />);

      expect(screen.getByText('command: echo hello')).toBeInTheDocument();
    });

    it('should pass expanded state to CommandInputArea', () => {
      render(<TmuxViewContainer {...defaultProps} commandExpanded={true} />);

      expect(screen.getByText('expanded: true')).toBeInTheDocument();
    });

    it('should pass connection state to TmuxKeyboard', () => {
      render(<TmuxViewContainer {...defaultProps} isConnected={false} />);

      expect(screen.getByText('connected: false')).toBeInTheDocument();
    });

    it('should pass loading state to TmuxKeyboard', () => {
      render(<TmuxViewContainer {...defaultProps} isLoading={true} />);

      expect(screen.getByText('loading: true')).toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('should render in collapsed mode by default', () => {
      render(<TmuxViewContainer {...defaultProps} commandExpanded={false} />);

      // Terminal output should be visible
      expect(screen.getByTestId('terminal-output')).toBeInTheDocument();
    });

    it('should render in expanded mode', () => {
      render(<TmuxViewContainer {...defaultProps} commandExpanded={true} />);

      // Command input should be visible in expanded mode
      expect(screen.getByTestId('command-input')).toBeInTheDocument();
    });
  });
});

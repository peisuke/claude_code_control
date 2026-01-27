import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SessionTreeView from '../SessionTreeView';
import { TmuxHierarchy } from '../../../types';

// Mock the API
jest.mock('../../../services/api', () => ({
  tmuxAPI: {
    createSession: jest.fn().mockResolvedValue({}),
    deleteSession: jest.fn().mockResolvedValue({}),
    createWindow: jest.fn().mockResolvedValue({}),
    deleteWindow: jest.fn().mockResolvedValue({})
  }
}));

import { tmuxAPI } from '../../../services/api';

const mockTmuxAPI = tmuxAPI as jest.Mocked<typeof tmuxAPI>;

describe('SessionTreeView', () => {
  const mockHierarchy: TmuxHierarchy = {
    sessions: {
      default: {
        name: 'default',
        windows: {
          '0': {
            index: '0',
            name: 'bash',
            panes: {
              '0': { index: '0', command: 'bash' }
            }
          },
          '1': {
            index: '1',
            name: 'vim',
            panes: {
              '0': { index: '0', command: 'vim' },
              '1': { index: '1', command: 'bash' }
            }
          }
        }
      },
      secondary: {
        name: 'secondary',
        windows: {
          '0': {
            index: '0',
            name: 'main',
            panes: {
              '0': { index: '0', command: 'zsh' }
            }
          }
        }
      }
    }
  };

  const defaultProps = {
    hierarchy: mockHierarchy,
    selectedTarget: 'default:0',
    onTargetChange: jest.fn(),
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.prompt and window.alert
    jest.spyOn(window, 'prompt').mockImplementation(() => 'test');
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('rendering', () => {
    it('should render add session button', () => {
      render(<SessionTreeView {...defaultProps} />);

      expect(screen.getByText('新規セッション')).toBeInTheDocument();
    });

    it('should render session names', () => {
      render(<SessionTreeView {...defaultProps} />);

      expect(screen.getByText('default')).toBeInTheDocument();
      expect(screen.getByText('secondary')).toBeInTheDocument();
    });

    it('should show empty state when no sessions', () => {
      render(<SessionTreeView {...defaultProps} hierarchy={{ sessions: {} }} />);

      expect(screen.getByText('セッションがありません')).toBeInTheDocument();
    });
  });

  describe('session expansion', () => {
    it('should auto-expand selected session', () => {
      render(<SessionTreeView {...defaultProps} selectedTarget="default:0" />);

      // Window should be visible because session is expanded
      expect(screen.getByText('0: bash')).toBeInTheDocument();
    });

    it('should toggle session expansion when chevron clicked', () => {
      render(<SessionTreeView {...defaultProps} selectedTarget="" />);

      // Initially windows might not be visible
      const expandIcons = screen.getAllByTestId('ChevronRightIcon');

      // Click to expand first session
      fireEvent.click(expandIcons[0]);

      // Window should now be visible
      expect(screen.getByText('0: bash')).toBeInTheDocument();
    });
  });

  describe('target selection', () => {
    it('should call onTargetChange when session clicked', () => {
      render(<SessionTreeView {...defaultProps} selectedTarget="" />);

      fireEvent.click(screen.getByText('default'));

      // Should select first window of the session
      expect(defaultProps.onTargetChange).toHaveBeenCalledWith('default:0');
    });

    it('should call onTargetChange when window clicked', () => {
      render(<SessionTreeView {...defaultProps} />);

      fireEvent.click(screen.getByText('1: vim'));

      // Window has multiple panes, so should select first pane
      expect(defaultProps.onTargetChange).toHaveBeenCalledWith('default:1.0');
    });

    it('should call onTargetChange when pane clicked', async () => {
      render(<SessionTreeView {...defaultProps} selectedTarget="default:1" />);

      // Need to expand window first (it has multiple panes)
      // The window should auto-expand since it's selected
      await waitFor(() => {
        expect(screen.getByText('0: vim')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('0: vim'));

      expect(defaultProps.onTargetChange).toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    it('should create new session when button clicked', async () => {
      render(<SessionTreeView {...defaultProps} />);

      fireEvent.click(screen.getByText('新規セッション'));

      await waitFor(() => {
        expect(mockTmuxAPI.createSession).toHaveBeenCalledWith('test');
      });

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('should handle empty session name with auto-naming', async () => {
      jest.spyOn(window, 'prompt').mockImplementation(() => '');

      render(<SessionTreeView {...defaultProps} />);

      fireEvent.click(screen.getByText('新規セッション'));

      await waitFor(() => {
        // Should auto-generate a numeric name
        expect(mockTmuxAPI.createSession).toHaveBeenCalled();
      });
    });

    it('should cancel session creation when prompt cancelled', async () => {
      jest.spyOn(window, 'prompt').mockImplementation(() => null);

      render(<SessionTreeView {...defaultProps} />);

      fireEvent.click(screen.getByText('新規セッション'));

      await waitFor(() => {
        expect(mockTmuxAPI.createSession).not.toHaveBeenCalled();
      });
    });

    it('should show delete confirmation dialog', () => {
      render(<SessionTreeView {...defaultProps} />);

      // Find delete button for a session
      const deleteButtons = screen.getAllByTitle('セッションを削除');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('セッション削除の確認')).toBeInTheDocument();
    });

    it('should delete session when confirmed', async () => {
      render(<SessionTreeView {...defaultProps} />);

      // Click delete on first session
      const deleteButtons = screen.getAllByTitle('セッションを削除');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      fireEvent.click(screen.getByText('削除'));

      await waitFor(() => {
        expect(mockTmuxAPI.deleteSession).toHaveBeenCalled();
      });

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('should cancel deletion when cancel clicked', async () => {
      render(<SessionTreeView {...defaultProps} />);

      // Click delete on first session
      const deleteButtons = screen.getAllByTitle('セッションを削除');
      fireEvent.click(deleteButtons[0]);

      // Cancel deletion
      fireEvent.click(screen.getByText('キャンセル'));

      expect(mockTmuxAPI.deleteSession).not.toHaveBeenCalled();
    });

    it('should prevent deleting last session', () => {
      const singleSessionHierarchy: TmuxHierarchy = {
        sessions: {
          only: {
            name: 'only',
            windows: {
              '0': { index: '0', name: 'main', panes: {} }
            }
          }
        }
      };

      render(<SessionTreeView {...defaultProps} hierarchy={singleSessionHierarchy} />);

      // The delete button should be disabled
      const deleteButton = screen.getByTitle('セッションを削除');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('window management', () => {
    it('should create new window when add button clicked', async () => {
      render(<SessionTreeView {...defaultProps} />);

      // Find add window button
      const addButtons = screen.getAllByTitle('ウィンドウを追加');
      fireEvent.click(addButtons[0]);

      await waitFor(() => {
        expect(mockTmuxAPI.createWindow).toHaveBeenCalled();
      });

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('should show window delete confirmation dialog', () => {
      render(<SessionTreeView {...defaultProps} />);

      // Find delete button for a window (need to expand session first)
      const deleteButtons = screen.getAllByTitle('ウィンドウを削除');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('ウィンドウ削除の確認')).toBeInTheDocument();
    });

    it('should delete window when confirmed', async () => {
      render(<SessionTreeView {...defaultProps} />);

      // Click delete on first window
      const deleteButtons = screen.getAllByTitle('ウィンドウを削除');
      fireEvent.click(deleteButtons[0]);

      // Confirm deletion
      fireEvent.click(screen.getByText('削除'));

      await waitFor(() => {
        expect(mockTmuxAPI.deleteWindow).toHaveBeenCalled();
      });

      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it('should prevent deleting last window in session', () => {
      const singleWindowHierarchy: TmuxHierarchy = {
        sessions: {
          default: {
            name: 'default',
            windows: {
              '0': { index: '0', name: 'only', panes: {} }
            }
          },
          secondary: {
            name: 'secondary',
            windows: {
              '0': { index: '0', name: 'main', panes: {} }
            }
          }
        }
      };

      render(<SessionTreeView {...defaultProps} hierarchy={singleWindowHierarchy} />);

      // The delete buttons for windows should be disabled
      const deleteButtons = screen.getAllByTitle('ウィンドウを削除');
      deleteButtons.forEach(btn => {
        expect(btn).toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should show alert when session creation fails', async () => {
      mockTmuxAPI.createSession.mockRejectedValue(new Error('Creation failed'));

      render(<SessionTreeView {...defaultProps} />);

      fireEvent.click(screen.getByText('新規セッション'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Creation failed');
      });
    });

    it('should show alert when deletion fails', async () => {
      mockTmuxAPI.deleteSession.mockRejectedValue(new Error('Deletion failed'));

      render(<SessionTreeView {...defaultProps} />);

      const deleteButtons = screen.getAllByTitle('セッションを削除');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByText('削除'));

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith('Deletion failed');
      });
    });
  });
});

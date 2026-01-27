import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SessionManager from '../SessionManager';

// Mock the API
jest.mock('../../../services/api', () => ({
  tmuxAPI: {
    getHierarchy: jest.fn()
  }
}));

import { tmuxAPI } from '../../../services/api';

const mockTmuxAPI = tmuxAPI as jest.Mocked<typeof tmuxAPI>;

describe('SessionManager', () => {
  const mockHierarchyData = {
    default: {
      name: 'default',
      windows: {
        '0': {
          index: '0',
          name: 'bash',
          panes: {
            '0': { index: '0', command: 'bash' }
          }
        }
      }
    }
  };

  const defaultProps = {
    onHierarchyLoad: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTmuxAPI.getHierarchy.mockResolvedValue({ data: mockHierarchyData });
  });

  describe('initial loading', () => {
    it('should load hierarchy on mount', async () => {
      render(<SessionManager {...defaultProps} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getHierarchy).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onHierarchyLoad with formatted data', async () => {
      render(<SessionManager {...defaultProps} />);

      await waitFor(() => {
        expect(defaultProps.onHierarchyLoad).toHaveBeenCalledWith({
          sessions: mockHierarchyData
        });
      });
    });

    it('should show refresh button', async () => {
      render(<SessionManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTitle('階層を更新')).toBeInTheDocument();
      });
    });
  });

  describe('refresh functionality', () => {
    it('should reload hierarchy when refresh button clicked', async () => {
      render(<SessionManager {...defaultProps} />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(defaultProps.onHierarchyLoad).toHaveBeenCalledTimes(1);
      });

      // Clear mocks to track only the refresh call
      mockTmuxAPI.getHierarchy.mockClear();

      const refreshButton = screen.getByTitle('階層を更新');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockTmuxAPI.getHierarchy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when loading fails', async () => {
      mockTmuxAPI.getHierarchy.mockRejectedValue(new Error('Network error'));

      render(<SessionManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display default error message for non-Error exceptions', async () => {
      mockTmuxAPI.getHierarchy.mockRejectedValue('Unknown error');

      render(<SessionManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('階層の読み込みに失敗しました')).toBeInTheDocument();
      });
    });

    it('should display error when hierarchy data is null', async () => {
      mockTmuxAPI.getHierarchy.mockResolvedValue({ data: null });

      render(<SessionManager {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Invalid hierarchy data format')).toBeInTheDocument();
      });
    });
  });

  describe('debug mode', () => {
    it('should not show debug information by default', async () => {
      render(<SessionManager {...defaultProps} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getHierarchy).toHaveBeenCalled();
      });

      expect(screen.queryByText('デバッグ情報')).not.toBeInTheDocument();
    });

    it('should show debug information when showDebug is true', async () => {
      render(<SessionManager {...defaultProps} showDebug={true} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getHierarchy).toHaveBeenCalled();
      });

      expect(screen.getByText('デバッグ情報')).toBeInTheDocument();
    });

    it('should expand debug accordion to show raw data', async () => {
      render(<SessionManager {...defaultProps} showDebug={true} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getHierarchy).toHaveBeenCalled();
      });

      const accordion = screen.getByText('デバッグ情報');
      fireEvent.click(accordion);

      expect(screen.getByText('生の階層データ:')).toBeInTheDocument();
      expect(screen.getByText('フォーマット済み階層:')).toBeInTheDocument();
    });
  });

  describe('ref methods', () => {
    it('should expose refresh method via ref', async () => {
      const ref = React.createRef<{ refresh: () => void }>();
      render(<SessionManager {...defaultProps} ref={ref} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getHierarchy).toHaveBeenCalledTimes(1);
      });

      // Call refresh via ref
      ref.current?.refresh();

      await waitFor(() => {
        expect(mockTmuxAPI.getHierarchy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('loading state', () => {
    it('should disable refresh button while loading', async () => {
      let resolvePromise: (value: { data: typeof mockHierarchyData }) => void;
      const pendingPromise = new Promise<{ data: typeof mockHierarchyData }>((resolve) => {
        resolvePromise = resolve;
      });
      mockTmuxAPI.getHierarchy.mockReturnValue(pendingPromise);

      render(<SessionManager {...defaultProps} />);

      // During loading, the button should be disabled
      const refreshButton = screen.getByTitle('階層を更新');
      expect(refreshButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ data: mockHierarchyData });

      await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
      });
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileExplorer from '../FileExplorer';

// Mock the API
jest.mock('../../../services/api', () => ({
  tmuxAPI: {
    getFileTree: jest.fn()
  }
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

import { tmuxAPI } from '../../../services/api';

const mockTmuxAPI = tmuxAPI as jest.Mocked<typeof tmuxAPI>;

describe('FileExplorer', () => {
  const mockFileTree = {
    success: true,
    data: {
      tree: [
        { name: 'folder1', path: '/home/user/folder1', type: 'directory' as const },
        { name: 'file1.txt', path: '/home/user/file1.txt', type: 'file' as const },
        { name: 'script.py', path: '/home/user/script.py', type: 'file' as const }
      ],
      current_path: '/home/user'
    }
  };

  const defaultProps = {
    isConnected: true,
    selectedFile: '',
    onFileSelect: jest.fn(),
    onFileOpen: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTmuxAPI.getFileTree.mockResolvedValue(mockFileTree);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('rendering', () => {
    it('should render file explorer title', async () => {
      render(<FileExplorer {...defaultProps} />);

      expect(screen.getByText('ファイルエクスプローラー')).toBeInTheDocument();
    });

    it('should render refresh button', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('RefreshIcon')).toBeInTheDocument();
      });
    });

    it('should render root button', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('ルート')).toBeInTheDocument();
      });
    });
  });

  describe('file tree loading', () => {
    it('should load file tree on mount when connected', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getFileTree).toHaveBeenCalled();
      });
    });

    it('should not load file tree when not connected', async () => {
      render(<FileExplorer {...defaultProps} isConnected={false} />);

      expect(mockTmuxAPI.getFileTree).not.toHaveBeenCalled();
    });

    it('should display files and folders after loading', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('folder1')).toBeInTheDocument();
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
        expect(screen.getByText('script.py')).toBeInTheDocument();
      });
    });

    it('should display current path', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('現在のパス:')).toBeInTheDocument();
      });
    });
  });

  describe('file selection', () => {
    it('should call onFileSelect when file clicked', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('file1.txt'));

      expect(defaultProps.onFileSelect).toHaveBeenCalledWith('/home/user/file1.txt');
    });

    it('should call onFileOpen when file clicked', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('file1.txt'));

      expect(defaultProps.onFileOpen).toHaveBeenCalledWith('/home/user/file1.txt');
    });

    it('should highlight selected file', async () => {
      render(<FileExplorer {...defaultProps} selectedFile="/home/user/file1.txt" />);

      await waitFor(() => {
        expect(screen.getByText('file1.txt')).toBeInTheDocument();
      });

      const listButton = screen.getByText('file1.txt').closest('[role="button"]');
      expect(listButton).toHaveClass('Mui-selected');
    });
  });

  describe('directory navigation', () => {
    it('should navigate to directory when clicked', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('folder1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('folder1'));

      expect(mockTmuxAPI.getFileTree).toHaveBeenCalledWith('/home/user/folder1');
    });

    it('should navigate to root when root button clicked', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getFileTree).toHaveBeenCalledTimes(1);
      });

      fireEvent.click(screen.getByText('ルート'));

      await waitFor(() => {
        expect(mockTmuxAPI.getFileTree).toHaveBeenCalledWith('/');
      });
    });

    it('should show parent folder button when not at root', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('親フォルダ')).toBeInTheDocument();
      });
    });

    it('should navigate to parent when parent button clicked', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('親フォルダ')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('親フォルダ'));

      await waitFor(() => {
        expect(mockTmuxAPI.getFileTree).toHaveBeenCalledWith('/home');
      });
    });
  });

  describe('refresh functionality', () => {
    it('should reload file tree when refresh clicked', async () => {
      render(<FileExplorer {...defaultProps} />);

      // Wait for initial load to complete
      await waitFor(() => {
        expect(screen.getByText('folder1')).toBeInTheDocument();
      });

      // Now RefreshIcon should be visible (not loading)
      const refreshButton = screen.getByTestId('RefreshIcon').closest('button');
      fireEvent.click(refreshButton!);

      await waitFor(() => {
        expect(mockTmuxAPI.getFileTree).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('error handling', () => {
    it('should display error message when loading fails', async () => {
      mockTmuxAPI.getFileTree.mockRejectedValue(new Error('Network error'));

      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should display error when API returns error response', async () => {
      mockTmuxAPI.getFileTree.mockResolvedValue({
        success: false,
        message: 'Permission denied'
      });

      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument();
      });
    });
  });

  describe('session storage', () => {
    it('should load from saved path on mount', async () => {
      mockSessionStorage.getItem.mockReturnValue('/saved/path');

      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockTmuxAPI.getFileTree).toHaveBeenCalledWith('/saved/path');
      });
    });

    it('should save current path to session storage', async () => {
      render(<FileExplorer {...defaultProps} />);

      await waitFor(() => {
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith('fileViewCurrentPath', '/home/user');
      });
    });
  });

  describe('disabled state', () => {
    it('should disable refresh when not connected', async () => {
      render(<FileExplorer {...defaultProps} isConnected={false} />);

      const refreshButton = screen.getByTestId('RefreshIcon').closest('button');
      expect(refreshButton).toBeDisabled();
    });
  });
});

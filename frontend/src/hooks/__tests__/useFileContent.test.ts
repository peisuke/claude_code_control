import { renderHook, act, waitFor } from '@testing-library/react';
import { useFileContent } from '../useFileContent';
import { tmuxAPI } from '../../services/api';

jest.mock('../../services/api');

const mockTmuxAPI = tmuxAPI as jest.Mocked<typeof tmuxAPI>;

describe('useFileContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have empty initial state', () => {
      const { result } = renderHook(() => useFileContent());

      expect(result.current.selectedFile).toBe('');
      expect(result.current.openedFile).toBe('');
      expect(result.current.hasFileContent).toBe(false);
      expect(result.current.fileContent).toBe('');
      expect(result.current.isImage).toBe(false);
      expect(result.current.mimeType).toBe('');
      expect(result.current.fileLoading).toBe(false);
      expect(result.current.fileError).toBeNull();
    });
  });

  describe('handleFileSelect', () => {
    it('should set selectedFile', () => {
      const { result } = renderHook(() => useFileContent());

      act(() => {
        result.current.handleFileSelect('/path/to/file.txt');
      });

      expect(result.current.selectedFile).toBe('/path/to/file.txt');
    });

    it('should be stable reference', () => {
      const { result, rerender } = renderHook(() => useFileContent());

      const handler1 = result.current.handleFileSelect;
      rerender();
      const handler2 = result.current.handleFileSelect;

      expect(handler1).toBe(handler2);
    });
  });

  describe('handleFileDeselect', () => {
    it('should clear all file state', () => {
      const { result } = renderHook(() => useFileContent());

      // Set some state first
      act(() => {
        result.current.handleFileSelect('/path/to/file.txt');
      });

      act(() => {
        result.current.handleFileDeselect();
      });

      expect(result.current.selectedFile).toBe('');
      expect(result.current.openedFile).toBe('');
      expect(result.current.hasFileContent).toBe(false);
      expect(result.current.fileContent).toBe('');
      expect(result.current.fileError).toBeNull();
    });
  });

  describe('handleFileOpen', () => {
    it('should load file content successfully', async () => {
      mockTmuxAPI.getFileContent.mockResolvedValueOnce({
        success: true,
        data: {
          content: 'file content here',
          is_image: false,
          mime_type: 'text/plain',
        },
      } as any);

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(result.current.openedFile).toBe('/path/to/file.txt');
      expect(result.current.fileContent).toBe('file content here');
      expect(result.current.hasFileContent).toBe(true);
      expect(result.current.isImage).toBe(false);
      expect(result.current.mimeType).toBe('text/plain');
      expect(result.current.fileLoading).toBe(false);
      expect(result.current.fileError).toBeNull();
    });

    it('should handle image files', async () => {
      mockTmuxAPI.getFileContent.mockResolvedValueOnce({
        success: true,
        data: {
          content: 'base64imagedata',
          is_image: true,
          mime_type: 'image/png',
        },
      } as any);

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.handleFileOpen('/path/to/image.png');
      });

      expect(result.current.isImage).toBe(true);
      expect(result.current.mimeType).toBe('image/png');
    });

    it('should set loading state during request', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockTmuxAPI.getFileContent.mockReturnValueOnce(promise as any);

      const { result } = renderHook(() => useFileContent());

      act(() => {
        result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(result.current.fileLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          data: { content: 'content', is_image: false, mime_type: 'text/plain' },
        });
      });

      expect(result.current.fileLoading).toBe(false);
    });

    it('should handle API error', async () => {
      mockTmuxAPI.getFileContent.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(result.current.fileError).toBe('Network error');
      expect(result.current.hasFileContent).toBe(false);
      expect(result.current.fileLoading).toBe(false);
    });

    it('should handle API response with success=false', async () => {
      mockTmuxAPI.getFileContent.mockResolvedValueOnce({
        success: false,
        message: 'File not found',
      } as any);

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.handleFileOpen('/path/to/nonexistent.txt');
      });

      expect(result.current.fileError).toBe('File not found');
      expect(result.current.hasFileContent).toBe(false);
    });

    it('should handle missing content in response', async () => {
      mockTmuxAPI.getFileContent.mockResolvedValueOnce({
        success: true,
        data: {},
      } as any);

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(result.current.fileError).toBe('Failed to load file content');
    });

    it('should call onFileOpened callback on success', async () => {
      const mockOnFileOpened = jest.fn();
      mockTmuxAPI.getFileContent.mockResolvedValueOnce({
        success: true,
        data: { content: 'content', is_image: false, mime_type: 'text/plain' },
      } as any);

      const { result } = renderHook(() => useFileContent(mockOnFileOpened));

      await act(async () => {
        await result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(mockOnFileOpened).toHaveBeenCalledTimes(1);
    });

    it('should not call onFileOpened callback on error', async () => {
      const mockOnFileOpened = jest.fn();
      mockTmuxAPI.getFileContent.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useFileContent(mockOnFileOpened));

      await act(async () => {
        await result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(mockOnFileOpened).not.toHaveBeenCalled();
    });

    it('should handle non-Error rejection', async () => {
      mockTmuxAPI.getFileContent.mockRejectedValueOnce('string error');

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(result.current.fileError).toBe('Failed to load file content');
    });

    it('should handle missing is_image and mime_type', async () => {
      mockTmuxAPI.getFileContent.mockResolvedValueOnce({
        success: true,
        data: { content: 'content' },
      } as any);

      const { result } = renderHook(() => useFileContent());

      await act(async () => {
        await result.current.handleFileOpen('/path/to/file.txt');
      });

      expect(result.current.isImage).toBe(false);
      expect(result.current.mimeType).toBe('');
    });
  });
});

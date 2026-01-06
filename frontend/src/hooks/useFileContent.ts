import { useState, useCallback } from 'react';
import { tmuxAPI } from '../services/api';

interface FileContentState {
  selectedFile: string;
  openedFile: string;
  hasFileContent: boolean;
  fileContent: string;
  isImage: boolean;
  mimeType: string;
  fileLoading: boolean;
  fileError: string | null;
}

interface UseFileContentReturn extends FileContentState {
  handleFileSelect: (path: string) => void;
  handleFileDeselect: () => void;
  handleFileOpen: (path: string) => Promise<void>;
}

export const useFileContent = (onFileOpened?: () => void): UseFileContentReturn => {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [openedFile, setOpenedFile] = useState<string>('');
  const [hasFileContent, setHasFileContent] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [isImage, setIsImage] = useState<boolean>(false);
  const [mimeType, setMimeType] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileSelect = useCallback((path: string) => {
    setSelectedFile(path);
  }, []);

  const handleFileDeselect = useCallback(() => {
    setSelectedFile('');
    setOpenedFile('');
    setHasFileContent(false);
    setFileContent('');
    setFileError(null);
  }, []);

  const handleFileOpen = useCallback(async (path: string) => {
    setFileLoading(true);
    setFileError(null);

    try {
      const response = await tmuxAPI.getFileContent(path);
      if (response.success && response.data?.content !== undefined) {
        setOpenedFile(path);
        setFileContent(response.data.content);
        setIsImage(response.data.is_image || false);
        setMimeType(response.data.mime_type || '');
        setHasFileContent(true);
        onFileOpened?.();
      } else {
        throw new Error(response.message || 'Failed to load file content');
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to load file content');
      console.error('Failed to open file:', err);
    } finally {
      setFileLoading(false);
    }
  }, [onFileOpened]);

  return {
    selectedFile,
    openedFile,
    hasFileContent,
    fileContent,
    isImage,
    mimeType,
    fileLoading,
    fileError,
    handleFileSelect,
    handleFileDeselect,
    handleFileOpen,
  };
};

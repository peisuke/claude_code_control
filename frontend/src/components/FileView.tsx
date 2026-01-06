import React, { useState, useEffect } from 'react';
import { Stack } from '@mui/material';
import FileExplorer from './file/FileExplorer';
import FileOperations from './file/FileOperations';
import { tmuxAPI } from '../services/api';

interface FileViewProps {
  isConnected: boolean;
}

const FileView: React.FC<FileViewProps> = ({ isConnected }) => {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [hasFileContent, setHasFileContent] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [isImage, setIsImage] = useState<boolean>(false);
  const [mimeType, setMimeType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Restore selected file on mount
  useEffect(() => {
    const savedSelectedFile = sessionStorage.getItem('fileViewSelectedFile');
    if (savedSelectedFile) {
      setSelectedFile(savedSelectedFile);
    }
  }, []);

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    // Save selected file to session storage
    sessionStorage.setItem('fileViewSelectedFile', path);
  };

  const handleFileDeselect = () => {
    setSelectedFile('');
    setHasFileContent(false);
    sessionStorage.removeItem('fileViewSelectedFile');
  };

  const handleDirectoryChange = (path: string) => {
    // Directory changes are handled within FileExplorer
  };

  const handleFileOpen = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await tmuxAPI.getFileContent(path);
      if (response.success && response.data?.content !== undefined) {
        setFileContent(response.data.content);
        setIsImage(response.data.is_image || false);
        setMimeType(response.data.mime_type || '');
        setHasFileContent(true);
      } else {
        throw new Error(response.message || 'Failed to load file content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file content');
      console.error('Failed to open file:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      {/* File Explorer - Hide only when file content is shown */}
      {!hasFileContent && (
        <FileExplorer
          isConnected={isConnected}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onDirectoryChange={handleDirectoryChange}
          onFileOpen={handleFileOpen}
        />
      )}
      
      {/* File Operations - Show only when file content is loaded */}
      {hasFileContent && (
        <FileOperations
          selectedFile={selectedFile}
          onFileDeselect={handleFileDeselect}
          onFileContentChange={setHasFileContent}
          fileContent={fileContent}
          isImage={isImage}
          mimeType={mimeType}
          loading={loading}
          error={error}
        />
      )}
    </Stack>
  );
};

export default FileView;
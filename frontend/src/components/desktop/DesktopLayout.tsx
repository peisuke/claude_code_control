import React, { useState } from 'react';
import { Box, Paper, Stack, IconButton, Toolbar, Typography } from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';
import TmuxViewContainer from '../tmux/TmuxViewContainer';
import FileOperations from '../file/FileOperations';
import ConnectionStatus from '../ConnectionStatus';
import { VIEW_MODES } from '../../constants/ui';
import { tmuxAPI } from '../../services/api';

interface DesktopLayoutProps {
  // View state
  viewMode: 'tmux' | 'file';
  onViewModeChange: (mode: 'tmux' | 'file') => void;

  // Connection state
  isConnected: boolean;
  wsConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  onReconnect: () => void;
  wsError: string | null;

  // Target selection
  selectedTarget: string;
  onTargetChange: (target: string) => void;

  // Tmux state
  output: string;
  command: string;
  onCommandChange: (command: string) => void;
  onSendCommand: () => Promise<void>;
  onSendEnter: () => Promise<void>;
  onSendKeyboardCommand: (cmd: string) => Promise<void>;
  commandExpanded: boolean;
  onToggleExpanded: () => void;

  // Output state
  isLoading: boolean;
  onOutputUpdate: (output: string) => void;
  error: string | null;

  // Settings
  onSettingsOpen: () => void;
}

const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  viewMode,
  onViewModeChange,
  isConnected,
  wsConnected,
  isReconnecting,
  reconnectAttempts,
  maxReconnectAttempts,
  onReconnect,
  wsError,
  selectedTarget,
  onTargetChange,
  output,
  command,
  onCommandChange,
  onSendCommand,
  onSendEnter,
  onSendKeyboardCommand,
  commandExpanded,
  onToggleExpanded,
  isLoading,
  onOutputUpdate,
  error,
  onSettingsOpen
}) => {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [hasFileContent, setHasFileContent] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [isImage, setIsImage] = useState<boolean>(false);
  const [mimeType, setMimeType] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  const handleFileDeselect = () => {
    setSelectedFile('');
    setHasFileContent(false);
  };

  const handleDirectoryChange = (path: string) => {
    // Directory changes are handled within Sidebar
  };

  const handleFileOpen = async (path: string) => {
    setFileLoading(true);
    setFileError(null);

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
      setFileError(err instanceof Error ? err.message : 'Failed to load file content');
      console.error('Failed to open file:', err);
    } finally {
      setFileLoading(false);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
      {/* Top Toolbar */}
      <Paper sx={{ flexShrink: 0 }}>
        <Toolbar variant="dense">
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 3 }}>
            Tmux Controller
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }}>
            {/* Connection Status */}
            <ConnectionStatus
              isConnected={isConnected}
              wsConnected={wsConnected}
              isReconnecting={isReconnecting}
              reconnectAttempts={reconnectAttempts}
              maxReconnectAttempts={maxReconnectAttempts}
              onReconnect={onReconnect}
              error={error}
              wsError={wsError}
            />
          </Stack>

          {/* Settings Button */}
          <IconButton onClick={onSettingsOpen} size="small" sx={{ ml: 2 }}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', p: 2, gap: 2 }}>
        {/* Left Sidebar */}
        <Box sx={{ width: 300, flexShrink: 0, overflow: 'hidden' }}>
          <Sidebar
            selectedTarget={selectedTarget}
            onTargetChange={onTargetChange}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onDirectoryChange={handleDirectoryChange}
            onFileOpen={handleFileOpen}
            isConnected={isConnected}
            viewMode={viewMode}
            onViewModeChange={onViewModeChange}
          />
        </Box>

        {/* Right Main Panel */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Tmux View */}
          {viewMode === VIEW_MODES.TMUX && (
            <TmuxViewContainer
              output={output}
              isConnected={isConnected}
              commandExpanded={commandExpanded}
              command={command}
              onCommandChange={onCommandChange}
              onSendCommand={onSendCommand}
              onSendEnter={onSendEnter}
              onSendKeyboardCommand={onSendKeyboardCommand}
              onToggleExpanded={onToggleExpanded}
              isLoading={isLoading}
              selectedTarget={selectedTarget}
              onOutputUpdate={onOutputUpdate}
            />
          )}

          {/* File View */}
          {viewMode === VIEW_MODES.FILE && (
            <Paper sx={{ height: '100%', overflow: 'hidden' }}>
              {hasFileContent ? (
                <FileOperations
                  selectedFile={selectedFile}
                  onFileDeselect={handleFileDeselect}
                  onFileContentChange={setHasFileContent}
                  fileContent={fileContent}
                  isImage={isImage}
                  mimeType={mimeType}
                  loading={fileLoading}
                  error={fileError}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    左側のファイルツリーからファイルを選択してください
                  </Typography>
                </Box>
              )}
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default DesktopLayout;

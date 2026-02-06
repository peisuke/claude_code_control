import React, { useState, useCallback } from 'react';
import { Box, Paper, Stack, IconButton, Toolbar, Typography } from '@mui/material';
import { Menu as MenuIcon, Settings as SettingsIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';
import TmuxViewContainer from '../tmux/TmuxViewContainer';
import FileOperations from '../file/FileOperations';
import ConnectionStatus from '../ConnectionStatus';
import { VIEW_MODES } from '../../constants/ui';
import { useFileContent } from '../../hooks/file';
import { useKeyboardShortcuts } from '../../hooks/tmux';

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
  error: string | null;
  onRefresh?: () => Promise<string | undefined>;
  onSetRefreshRate?: (interval: number) => void;

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
  error,
  onRefresh,
  onSetRefreshRate,
  onSettingsOpen
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const {
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
  } = useFileContent();

  // Enable keyboard shortcuts in tmux view mode
  useKeyboardShortcuts({
    enabled: viewMode === VIEW_MODES.TMUX,
    onSendKeyboardCommand,
    isConnected,
    isLoading
  });

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Top Toolbar */}
      <Paper sx={{ flexShrink: 0 }}>
        <Toolbar variant="dense">
          <IconButton
            edge="start"
            onClick={handleSidebarToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

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
              isOnline={navigator.onLine}
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
        {sidebarOpen && (
          <Box sx={{ width: 360, flexShrink: 0, overflow: 'hidden' }}>
            <Sidebar
              selectedTarget={selectedTarget}
              onTargetChange={onTargetChange}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFileOpen={handleFileOpen}
              isConnected={isConnected}
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
            />
          </Box>
        )}

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
              onRefresh={onRefresh}
              onSetRefreshRate={onSetRefreshRate}
              onReconnect={onReconnect}
            />
          )}

          {/* File View */}
          {viewMode === VIEW_MODES.FILE && (
            <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {hasFileContent ? (
                <FileOperations
                  selectedFile={openedFile}
                  onFileDeselect={handleFileDeselect}
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

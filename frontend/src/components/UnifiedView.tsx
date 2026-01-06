import React, { useState } from 'react';
import { Paper, useMediaQuery, useTheme, Drawer, IconButton, Box, Toolbar, Typography } from '@mui/material';
import { Menu as MenuIcon, Settings as SettingsIcon } from '@mui/icons-material';
import TmuxViewContainer from './tmux/TmuxViewContainer';
import FileOperations from './file/FileOperations';
import ViewStateCoordinator from './view/ViewStateCoordinator';
import DesktopLayout from './desktop/DesktopLayout';
import Sidebar from './desktop/Sidebar';
import ConnectionStatus from './ConnectionStatus';
import { VIEW_MODES } from '../constants/ui';
import { tmuxAPI } from '../services/api';

interface UnifiedViewProps {
  isConnected: boolean;
  onSettingsOpen: () => void;
  selectedTarget: string;
  onTargetChange: (target: string) => void;
}

const UnifiedView: React.FC<UnifiedViewProps> = ({
  isConnected,
  onSettingsOpen,
  selectedTarget,
  onTargetChange
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [openedFile, setOpenedFile] = useState<string>('');
  const [hasFileContent, setHasFileContent] = useState<boolean>(false);
  const [fileContent, setFileContent] = useState<string>('');
  const [isImage, setIsImage] = useState<boolean>(false);
  const [mimeType, setMimeType] = useState<string>('');
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
  };

  const handleDirectoryChange = (path: string) => {
    // Handled within FileExplorer
  };

  const handleFileDeselect = () => {
    setSelectedFile('');
    setOpenedFile('');
    setHasFileContent(false);
  };

  const handleFileOpen = async (path: string) => {
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
        setDrawerOpen(false); // Close drawer after opening file
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
    <ViewStateCoordinator
      selectedTarget={selectedTarget}
      isConnected={isConnected}
    >
      {(state, handlers) => {
        const handleViewModeChange = (mode: 'tmux' | 'file') => {
          if (mode !== state.viewMode) {
            handlers.handleViewModeToggle();
          }
        };

        return (
          <>
            {/* Desktop Layout - Show on screens >= md (960px) */}
            {isDesktop ? (
            <DesktopLayout
              viewMode={state.viewMode as 'tmux' | 'file'}
              onViewModeChange={handleViewModeChange}
              isConnected={isConnected}
              wsConnected={state.wsConnected}
              isReconnecting={state.isReconnecting}
              reconnectAttempts={state.reconnectAttempts}
              maxReconnectAttempts={state.maxReconnectAttempts}
              onReconnect={handlers.wsResetAndReconnect}
              wsError={state.wsError}
              selectedTarget={selectedTarget}
              onTargetChange={onTargetChange}
              output={state.output}
              command={state.command}
              onCommandChange={handlers.setCommand}
              onSendCommand={handlers.handleSendCommand}
              onSendEnter={handlers.handleSendEnter}
              onSendKeyboardCommand={handlers.handleKeyboardCommand}
              commandExpanded={state.commandExpanded}
              onToggleExpanded={() => handlers.setCommandExpanded(!state.commandExpanded)}
              isLoading={state.isLoading}
              onOutputUpdate={handlers.setOutput}
              error={state.error}
              onSettingsOpen={onSettingsOpen}
            />
          ) : (
            /* Mobile Layout - Show on screens < md */
            <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'grey.100' }}>
              {/* Mobile Top Bar */}
              <Paper sx={{ flexShrink: 0 }}>
                <Toolbar variant="dense">
                  <IconButton
                    edge="start"
                    onClick={handleDrawerToggle}
                    sx={{ mr: 2 }}
                  >
                    <MenuIcon />
                  </IconButton>

                  <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Tmux Controller
                  </Typography>

                  <ConnectionStatus
                    isConnected={isConnected}
                    wsConnected={state.wsConnected}
                    isReconnecting={state.isReconnecting}
                    reconnectAttempts={state.reconnectAttempts}
                    maxReconnectAttempts={state.maxReconnectAttempts}
                    onReconnect={handlers.wsResetAndReconnect}
                    error={state.error}
                    wsError={state.wsError}
                  />

                  <IconButton onClick={onSettingsOpen} size="small">
                    <SettingsIcon />
                  </IconButton>
                </Toolbar>
              </Paper>

              {/* Mobile Drawer */}
              <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={handleDrawerToggle}
                sx={{
                  '& .MuiDrawer-paper': {
                    width: '100%',
                    maxWidth: 360
                  }
                }}
              >
                <Sidebar
                  selectedTarget={selectedTarget}
                  onTargetChange={(target) => {
                    onTargetChange(target);
                    setDrawerOpen(false); // Close drawer after session/window/pane selection
                  }}
                  selectedFile={selectedFile}
                  onFileSelect={handleFileSelect}
                  onDirectoryChange={handleDirectoryChange}
                  onFileOpen={handleFileOpen}
                  isConnected={isConnected}
                  viewMode={state.viewMode as 'tmux' | 'file'}
                  onViewModeChange={(mode) => {
                    handleViewModeChange(mode);
                    setDrawerOpen(false); // Close drawer after tab change
                  }}
                />
              </Drawer>

              {/* Main Content */}
              <Box sx={{ flex: 1, overflow: 'hidden', p: 1 }}>
                {state.viewMode === VIEW_MODES.TMUX && (
                  <TmuxViewContainer
                    output={state.output}
                    isConnected={isConnected}
                    commandExpanded={state.commandExpanded}
                    command={state.command}
                    onCommandChange={handlers.setCommand}
                    onSendCommand={handlers.handleSendCommand}
                    onSendEnter={handlers.handleSendEnter}
                    onSendKeyboardCommand={handlers.handleKeyboardCommand}
                    onToggleExpanded={() => handlers.setCommandExpanded(!state.commandExpanded)}
                    isLoading={state.isLoading}
                    selectedTarget={selectedTarget}
                    onOutputUpdate={handlers.setOutput}
                  />
                )}

                {state.viewMode === VIEW_MODES.FILE && (
                  <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {hasFileContent ? (
                      <FileOperations
                        selectedFile={openedFile}
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
                          メニューからファイルを選択してください
                        </Typography>
                      </Box>
                    )}
                  </Paper>
                )}
              </Box>
            </Box>
          )}
        </>
        );
      }}
    </ViewStateCoordinator>
  );
};

export default UnifiedView;

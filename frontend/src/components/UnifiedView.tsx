import React, { useState, useCallback } from 'react';
import { Paper, useMediaQuery, useTheme, Drawer, IconButton, Box, Toolbar, Typography } from '@mui/material';
import { Menu as MenuIcon, Settings as SettingsIcon } from '@mui/icons-material';
import TmuxViewContainer from './tmux/TmuxViewContainer';
import FileOperations from './file/FileOperations';
import ViewStateCoordinator from './view/ViewStateCoordinator';
import DesktopLayout from './desktop/DesktopLayout';
import Sidebar from './desktop/Sidebar';
import ConnectionStatus from './ConnectionStatus';
import { VIEW_MODES } from '../constants/ui';
import { useFileContent } from '../hooks/useFileContent';

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

  const handleDrawerToggle = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  // Use file content hook with drawer close callback for mobile
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
  } = useFileContent(closeDrawer);

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
                    isOnline={navigator.onLine}
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
                  onFileOpen={handleFileOpen}
                  isConnected={isConnected}
                  viewMode={state.viewMode as 'tmux' | 'file'}
                  onViewModeChange={handleViewModeChange}
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

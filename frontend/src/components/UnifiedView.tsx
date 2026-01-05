import React from 'react';
import { Stack, Paper, useMediaQuery, useTheme } from '@mui/material';
import ControlPanel from './terminal/ControlPanel';
import TmuxViewContainer from './tmux/TmuxViewContainer';
import FileView from './FileView';
import ViewStateCoordinator from './view/ViewStateCoordinator';
import DesktopLayout from './desktop/DesktopLayout';
import { VIEW_MODES } from '../constants/ui';

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

  return (
    <ViewStateCoordinator
      selectedTarget={selectedTarget}
      isConnected={isConnected}
    >
      {(state, handlers) => (
        <>
          {/* Desktop Layout - Show on screens >= md (960px) */}
          {isDesktop ? (
            <DesktopLayout
              viewMode={state.viewMode as 'tmux' | 'file'}
              onViewModeToggle={handlers.handleViewModeToggle}
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
              onShowHistory={handlers.handleShowHistory}
              commandExpanded={state.commandExpanded}
              onToggleExpanded={() => handlers.setCommandExpanded(!state.commandExpanded)}
              autoRefresh={state.autoRefresh}
              onAutoRefreshToggle={handlers.handleAutoRefreshToggle}
              isLoading={state.isLoading}
              onRefresh={handlers.handleRefresh}
              error={state.error}
              onSettingsOpen={onSettingsOpen}
            />
          ) : (
            /* Mobile Layout - Show on screens < md */
            <Stack spacing={2} sx={{ height: '100vh', p: 2, overflow: 'hidden' }}>
              {/* Control Panel - Fixed height */}
              <Paper sx={{ flexShrink: 0 }}>
                <ControlPanel
                  viewMode={state.viewMode as 'tmux' | 'file'}
                  onViewModeToggle={handlers.handleViewModeToggle}
                  isConnected={isConnected}
                  wsConnected={state.wsConnected}
                  isReconnecting={state.isReconnecting}
                  reconnectAttempts={state.reconnectAttempts}
                  maxReconnectAttempts={state.maxReconnectAttempts}
                  onReconnect={handlers.wsResetAndReconnect}
                  onSettingsOpen={onSettingsOpen}
                  selectedTarget={selectedTarget}
                  onTargetChange={onTargetChange}
                  autoRefresh={state.autoRefresh}
                  onAutoRefreshToggle={handlers.handleAutoRefreshToggle}
                  isLoading={state.isLoading}
                  onRefresh={handlers.handleRefresh}
                  error={state.error}
                  wsError={state.wsError}
                />
              </Paper>

              {/* Tmux View Container */}
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
                  onShowHistory={handlers.handleShowHistory}
                  onToggleExpanded={() => handlers.setCommandExpanded(!state.commandExpanded)}
                  isLoading={state.isLoading}
                />
              )}

              {/* File View - Show when in file mode */}
              {state.viewMode === VIEW_MODES.FILE && (
                <Paper sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <FileView isConnected={isConnected} />
                </Paper>
              )}
            </Stack>
          )}
        </>
      )}
    </ViewStateCoordinator>
  );
};

export default UnifiedView;
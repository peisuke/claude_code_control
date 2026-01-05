import React from 'react';
import { Stack, Paper } from '@mui/material';
import ControlPanel from './terminal/ControlPanel';
import TmuxViewContainer from './tmux/TmuxViewContainer';
import FileView from './FileView';
import ViewStateCoordinator from './view/ViewStateCoordinator';
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
  return (
    <ViewStateCoordinator 
      selectedTarget={selectedTarget}
      isConnected={isConnected}
    >
      {(state, handlers) => (
        <Stack spacing={1.5} sx={{ height: '100vh', p: 1, overflow: 'hidden' }}>
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
              isLoading={state.isLoading}
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
              onToggleExpanded={() => handlers.setCommandExpanded(!state.commandExpanded)}
              isLoading={state.isLoading}
              selectedTarget={selectedTarget}
              onOutputUpdate={handlers.setOutput}
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
    </ViewStateCoordinator>
  );
};

export default UnifiedView;
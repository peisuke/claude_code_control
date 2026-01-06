import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { FolderOpen, Terminal } from '@mui/icons-material';
import SessionTreeView from '../tmux/SessionTreeView';
import SessionManager, { SessionManagerRef } from '../tmux/SessionManager';
import FileExplorer from '../file/FileExplorer';
import { TmuxHierarchy } from '../../types';

interface SidebarProps {
  selectedTarget: string;
  onTargetChange: (target: string) => void;
  selectedFile: string;
  onFileSelect: (path: string) => void;
  onFileOpen?: (path: string) => void;
  isConnected: boolean;
  viewMode: 'tmux' | 'file';
  onViewModeChange: (mode: 'tmux' | 'file') => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedTarget,
  onTargetChange,
  selectedFile,
  onFileSelect,
  onFileOpen,
  isConnected,
  viewMode,
  onViewModeChange
}) => {
  const [hierarchy, setHierarchy] = useState<TmuxHierarchy | null>(null);
  const sessionManagerRef = useRef<SessionManagerRef>(null);

  const handleRefresh = useCallback(() => {
    sessionManagerRef.current?.refresh();
  }, []);

  // Sync activeTab with viewMode
  const activeTab = viewMode === 'tmux' ? 0 : 1;

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    // Tab 0 = tmux, Tab 1 = file
    onViewModeChange(newValue === 0 ? 'tmux' : 'file');
  };

  const handleHierarchyLoad = useCallback((newHierarchy: TmuxHierarchy) => {
    setHierarchy(newHierarchy);
  }, []);

  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header with Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth" sx={{ minHeight: 40 }}>
          <Tab icon={<Terminal fontSize="small" />} label="セッション" iconPosition="start" sx={{ minHeight: 40, py: 0.5 }} />
          <Tab icon={<FolderOpen fontSize="small" />} label="ファイル" iconPosition="start" sx={{ minHeight: 40, py: 0.5 }} />
        </Tabs>
      </Box>

      {/* Tab Panel: Sessions */}
      {activeTab === 0 && (
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 1 }}>
            <SessionManager ref={sessionManagerRef} onHierarchyLoad={handleHierarchyLoad} />
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <SessionTreeView
              hierarchy={hierarchy}
              selectedTarget={selectedTarget}
              onTargetChange={onTargetChange}
              onRefresh={handleRefresh}
            />
          </Box>
        </Box>
      )}

      {/* Tab Panel: Files */}
      {activeTab === 1 && (
        <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <FileExplorer
            isConnected={isConnected}
            selectedFile={selectedFile}
            onFileSelect={onFileSelect}
            onFileOpen={onFileOpen}
          />
        </Box>
      )}
    </Paper>
  );
};

export default Sidebar;

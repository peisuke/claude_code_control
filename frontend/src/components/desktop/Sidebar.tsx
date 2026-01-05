import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { FolderOpen, Terminal } from '@mui/icons-material';
import SessionTreeView from '../tmux/SessionTreeView';
import SessionManager from '../tmux/SessionManager';
import FileExplorer from '../file/FileExplorer';
import { TmuxHierarchy } from '../../types';

interface SidebarProps {
  selectedTarget: string;
  onTargetChange: (target: string) => void;
  selectedFile: string;
  onFileSelect: (path: string) => void;
  onDirectoryChange: (path: string) => void;
  onFileOpen?: (path: string) => void;
  isConnected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedTarget,
  onTargetChange,
  selectedFile,
  onFileSelect,
  onDirectoryChange,
  onFileOpen,
  isConnected
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [hierarchy, setHierarchy] = useState<TmuxHierarchy | null>(null);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<Terminal fontSize="small" />} label="セッション" iconPosition="start" />
          <Tab icon={<FolderOpen fontSize="small" />} label="ファイル" iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Panel: Sessions */}
      {activeTab === 0 && (
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 1 }}>
            <SessionManager onHierarchyLoad={handleHierarchyLoad} />
          </Box>
          <Divider />
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <SessionTreeView
              hierarchy={hierarchy}
              selectedTarget={selectedTarget}
              onTargetChange={onTargetChange}
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
            onDirectoryChange={onDirectoryChange}
            onFileOpen={onFileOpen}
          />
        </Box>
      )}
    </Paper>
  );
};

export default Sidebar;

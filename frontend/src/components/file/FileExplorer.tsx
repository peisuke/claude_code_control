import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Stack,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  ChevronRight,
  Folder,
  InsertDriveFile,
  Refresh
} from '@mui/icons-material';
import { tmuxAPI } from '../../services/api';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileExplorerProps {
  isConnected: boolean;
  selectedFile: string;
  onFileSelect: (path: string) => void;
  onDirectoryChange: (path: string) => void;
  onFileOpen?: (path: string) => void;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  isConnected,
  selectedFile,
  onFileSelect,
  onDirectoryChange,
  onFileOpen
}) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  // Helper function to format path display
  const formatPathDisplay = (path: string): string => {
    if (!path || path === '/') return '/';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 3) return path;
    return '.../' + parts.slice(-3).join('/');
  };

  const loadFileTree = useCallback(async (path: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const response = await tmuxAPI.getFileTree(path);
      if (response.success && response.data?.tree) {
        setFileTree(response.data.tree);
        const actualPath = response.data.current_path || path;
        setCurrentPath(actualPath);
        setBreadcrumbs(actualPath ? actualPath.split('/').filter(Boolean) : []);
        // Save current path to session storage
        sessionStorage.setItem('fileViewCurrentPath', actualPath);
        onDirectoryChange(actualPath);
      } else {
        throw new Error(response.message || 'Failed to load file tree');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tree');
    } finally {
      setLoading(false);
    }
  }, [onDirectoryChange]);

  // Load file tree when component mounts or connection status changes
  useEffect(() => {
    if (isConnected) {
      // Load from last saved path or initial path
      const savedPath = sessionStorage.getItem('fileViewCurrentPath') || '';
      loadFileTree(savedPath);
    }
  }, [isConnected, loadFileTree]);

  const handleDirectoryClick = (path: string) => {
    loadFileTree(path);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      // Go to filesystem root
      loadFileTree('/');
    } else {
      const newPath = '/' + breadcrumbs.slice(0, index + 1).join('/');
      loadFileTree(newPath);
    }
  };

  const handleGoToParent = () => {
    if (currentPath && currentPath !== '/') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
      loadFileTree(parentPath);
    }
  };

  const renderFileList = (nodes: FileNode[]) => {
    return nodes.map((node) => (
      <ListItem key={node.path} disablePadding>
        <ListItemButton
          onClick={() => {
            if (node.type === 'directory') {
              handleDirectoryClick(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
          selected={selectedFile === node.path}
        >
          <ListItemIcon>
            {node.type === 'directory' ? (
              <Folder color="primary" />
            ) : (
              <InsertDriveFile />
            )}
          </ListItemIcon>
          <ListItemText 
            primary={node.name}
            primaryTypographyProps={{ variant: 'body2' }}
          />
        </ListItemButton>
      </ListItem>
    ));
  };

  return (
    <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Stack spacing={2} sx={{ p: 2, height: '100%' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">ファイルエクスプローラー</Typography>
          <IconButton onClick={() => loadFileTree(currentPath)} disabled={loading || !isConnected}>
            {loading ? <CircularProgress size={20} /> : <Refresh />}
          </IconButton>
        </Stack>

        {/* Breadcrumbs and Navigation */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack direction="row" spacing={1} alignItems="center">
              <Button 
                size="small" 
                onClick={() => handleBreadcrumbClick(-1)}
                startIcon={<Folder />}
                variant="outlined"
              >
                ルート
              </Button>
              {currentPath && currentPath !== '/' && (
                <Button 
                  size="small" 
                  onClick={handleGoToParent}
                  startIcon={<ChevronRight style={{ transform: 'rotate(180deg)' }} />}
                  variant="outlined"
                >
                  親フォルダ
                </Button>
              )}
            </Stack>
            
            {/* Open File Button */}
            {selectedFile && onFileOpen && (
              <Button
                variant="contained"
                size="small"
                onClick={() => onFileOpen(selectedFile)}
                startIcon={<InsertDriveFile />}
              >
                Open
              </Button>
            )}
          </Stack>
          
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Typography variant="body2" color="text.secondary">
              現在のパス:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: 'monospace', 
                backgroundColor: 'grey.100', 
                px: 1, 
                borderRadius: 0.5,
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              title={currentPath || '/'}
            >
              {formatPathDisplay(currentPath)}
            </Typography>
          </Stack>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        {/* File List */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List dense>
            {renderFileList(fileTree)}
          </List>
        </Box>
      </Stack>
    </Paper>
  );
};

export default FileExplorer;
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Stack,
  Button,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  ChevronRight,
  Folder,
  InsertDriveFile,
  Refresh,
  Close,
  FolderOpen
} from '@mui/icons-material';
import { tmuxAPI } from '../services/api';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileViewProps {
  isConnected: boolean;
}

const FileView: React.FC<FileViewProps> = ({ isConnected }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);

  // Helper function to format path display
  const formatPathDisplay = (path: string): string => {
    if (!path || path === '/') return '/';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 3) return path;
    return '.../' + parts.slice(-3).join('/');
  };

  // Helper function to detect language from file extension
  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'java': 'java',
      'kt': 'kotlin',
      'swift': 'swift',
      'php': 'php',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'md': 'markdown',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
      'ps1': 'powershell',
      'bat': 'batch',
      'dockerfile': 'dockerfile',
      'sql': 'sql',
      'vim': 'vim',
      'lua': 'lua',
      'r': 'r',
      'dart': 'dart',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    
    return languageMap[ext] || 'text';
  };

  // Load file tree when component mounts or connection status changes
  useEffect(() => {
    if (isConnected) {
      // Load from last saved path or initial path
      const savedPath = sessionStorage.getItem('fileViewCurrentPath') || '';
      loadFileTree(savedPath);
      
      // Restore selected file if any
      const savedSelectedFile = sessionStorage.getItem('fileViewSelectedFile');
      if (savedSelectedFile) {
        setSelectedFile(savedSelectedFile);
      }
    }
  }, [isConnected]);

  const loadFileTree = async (path: string = '') => {
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
      } else {
        throw new Error(response.message || 'Failed to load file tree');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tree');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryClick = (path: string) => {
    loadFileTree(path);
  };

  const handleFileSelect = (path: string) => {
    setSelectedFile(path);
    // Save selected file to session storage
    sessionStorage.setItem('fileViewSelectedFile', path);
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

  const handleOpenFile = async () => {
    if (!selectedFile) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await tmuxAPI.getFileContent(selectedFile);
      if (response.success && response.data?.content !== undefined) {
        setFileContent(response.data.content);
      } else {
        throw new Error(response.message || 'Failed to load file content');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file content');
    } finally {
      setLoading(false);
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
              handleFileSelect(node.path);
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
    <Stack spacing={2} sx={{ height: '100%' }}>
      {/* File Tree - Hide when file content is shown */}
      {!fileContent && (
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

          {/* Selected File Actions - Moved to top */}
          {selectedFile && (
            <Paper variant="outlined" sx={{ p: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: 1, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  title={selectedFile}
                >
                  選択: {selectedFile.split('/').pop()}
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleOpenFile}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} /> : <InsertDriveFile />}
                >
                  Open
                </Button>
              </Stack>
            </Paper>
          )}

          {/* File List */}
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <List dense>
              {renderFileList(fileTree)}
            </List>
          </Box>
          </Stack>
        </Paper>
      )}

      {/* File Content - Show full height when visible */}
      {fileContent && (
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Stack sx={{ p: 2, height: '100%' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography 
                variant="subtitle1"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '80%'
                }}
                title={selectedFile}
              >
                {selectedFile.split('/').pop()}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => {
                  setFileContent('');
                  setSelectedFile('');
                  // Clear selected file from session storage
                  sessionStorage.removeItem('fileViewSelectedFile');
                }}
                title="閉じる"
              >
                <Close />
              </IconButton>
            </Stack>
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: '#1e1e1e',
                borderRadius: 1
              }}
            >
              <SyntaxHighlighter
                language={getLanguageFromFileName(selectedFile)}
                style={tomorrow}
                customStyle={{
                  margin: 0,
                  padding: '16px',
                  fontSize: '13px',
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                  backgroundColor: '#1e1e1e',
                  borderRadius: '4px'
                }}
                showLineNumbers={true}
                lineNumberStyle={{
                  color: '#6e7681',
                  backgroundColor: 'transparent',
                  paddingRight: '16px',
                  minWidth: '50px'
                }}
                wrapLines={true}
                wrapLongLines={true}
              >
                {fileContent}
              </SyntaxHighlighter>
            </Box>
          </Stack>
        </Paper>
      )}
    </Stack>
  );
};

export default FileView;
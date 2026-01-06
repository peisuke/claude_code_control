import React from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close
} from '@mui/icons-material';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileOperationsProps {
  selectedFile: string;
  onFileDeselect: () => void;
  fileContent?: string;
  isImage?: boolean;
  mimeType?: string;
  loading?: boolean;
  error?: string | null;
}

const FileOperations: React.FC<FileOperationsProps> = ({
  selectedFile,
  onFileDeselect,
  fileContent = '',
  isImage = false,
  mimeType = '',
  loading = false,
  error = null
}) => {

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

  const handleCloseFile = () => {
    onFileDeselect();
    sessionStorage.removeItem('fileViewSelectedFile');
  };

  // Show loading state
  if (loading) {
    return (
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body1" color="text.secondary">
            ファイルを読み込み中...
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Show error state
  if (error) {
    return (
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">{selectedFile.split('/').pop()}</Typography>
          <IconButton size="small" onClick={handleCloseFile} title="閉じる">
            <Close />
          </IconButton>
        </Stack>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* File Content - Show when loaded */}
      {fileContent !== undefined ? (
        <Stack sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, flexShrink: 0 }}>
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
              onClick={handleCloseFile}
              title="閉じる"
            >
              <Close />
            </IconButton>
          </Stack>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              backgroundColor: isImage ? '#f5f5f5' : '#1e1e1e',
              borderRadius: 1,
              display: 'flex',
              justifyContent: isImage ? 'center' : 'flex-start',
              alignItems: isImage ? 'center' : 'flex-start'
            }}
          >
            {fileContent || fileContent === '' ? (
              isImage ? (
                <Box
                  sx={{
                    p: 2,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <img
                    src={`data:${mimeType};base64,${fileContent}`}
                    alt={selectedFile.split('/').pop()}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                </Box>
              ) : (
                <SyntaxHighlighter
                  language={getLanguageFromFileName(selectedFile)}
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    padding: '16px',
                    fontSize: '13px',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                    backgroundColor: '#1e1e1e',
                    borderRadius: '4px',
                    width: '100%',
                    minWidth: 0,
                    height: 'auto',
                    overflow: 'visible'
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
                  {fileContent || '(空のファイル)'}
                </SyntaxHighlighter>
              )
            ) : (
              <Box sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                <Typography>ファイルの内容を読み込み中...</Typography>
              </Box>
            )}
          </Box>
        </Stack>
      ) : (
        /* No file content to display */
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          <Typography variant="body1" color="text.secondary">
            {selectedFile ? 'ファイルを開いてください' : 'ファイルを選択してください'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FileOperations;
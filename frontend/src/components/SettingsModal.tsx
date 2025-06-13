import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Typography,
  Box,
  IconButton,
  DialogContentText,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Close, Add, Delete, AddBox, FolderOpen, Window, ViewInAr, ExpandMore, ChevronRight } from '@mui/icons-material';
import { tmuxAPI } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'session' | 'window';
    name: string;
    onConfirm: () => void;
  }>({ open: false, type: 'session', name: '', onConfirm: () => {} });

  const loadHierarchy = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await tmuxAPI.getHierarchy();
      setHierarchy(response.data);
    } catch (err) {
      console.error('Error loading hierarchy:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tmux hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHierarchy();
    }
  }, [isOpen]);

  useEffect(() => {
    if (hierarchy) {
      // Auto-expand all sessions
      setExpandedSessions(new Set(Object.keys(hierarchy)));
    }
  }, [hierarchy]);

  const toggleSessionExpansion = (sessionName: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionName)) {
      newExpanded.delete(sessionName);
    } else {
      newExpanded.add(sessionName);
    }
    setExpandedSessions(newExpanded);
  };

  const handleCreateSession = async () => {
    const newSessionName = prompt('新しいセッション名を入力してください:', '');
    if (newSessionName && newSessionName.trim()) {
      try {
        setLoading(true);
        setError(null);
        await tmuxAPI.createSession(newSessionName.trim());
        await loadHierarchy();
      } catch (err) {
        console.error('Error creating session:', err);
        setError(err instanceof Error ? err.message : 'Failed to create session');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteSession = (sessionName: string) => {
    const sessions = Object.keys(hierarchy || {});
    if (sessions.length <= 1) {
      alert('最後のセッションは削除できません');
      return;
    }

    setDeleteDialog({
      open: true,
      type: 'session',
      name: sessionName,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          await tmuxAPI.deleteSession(sessionName);
          await loadHierarchy();
        } catch (err) {
          console.error('Error deleting session:', err);
          setError(err instanceof Error ? err.message : 'Failed to delete session');
        } finally {
          setLoading(false);
          setDeleteDialog({ open: false, type: 'session', name: '', onConfirm: () => {} });
        }
      }
    });
  };

  const handleCreateWindow = async (sessionName: string) => {
    const windowName = prompt('新しいウィンドウ名を入力してください（空の場合は自動命名）:', '');
    if (windowName !== null) {
      try {
        setLoading(true);
        setError(null);
        await tmuxAPI.createWindow(sessionName, windowName.trim() || undefined);
        await loadHierarchy();
      } catch (err) {
        console.error('Error creating window:', err);
        setError(err instanceof Error ? err.message : 'Failed to create window');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteWindow = (sessionName: string, windowIndex: string, windowName: string) => {
    const session = hierarchy?.[sessionName];
    const windows = Object.keys(session?.windows || {});
    if (windows.length <= 1) {
      alert('最後のウィンドウは削除できません');
      return;
    }

    setDeleteDialog({
      open: true,
      type: 'window',
      name: `${windowIndex}: ${windowName}`,
      onConfirm: async () => {
        try {
          setLoading(true);
          setError(null);
          await tmuxAPI.deleteWindow(sessionName, windowIndex);
          await loadHierarchy();
        } catch (err) {
          console.error('Error deleting window:', err);
          setError(err instanceof Error ? err.message : 'Failed to delete window');
        } finally {
          setLoading(false);
          setDeleteDialog({ open: false, type: 'session', name: '', onConfirm: () => {} });
        }
      }
    });
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          セッション・ウィンドウ管理
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Error Alert */}
            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            {loading && (
              <Stack direction="row" spacing={2} alignItems="center">
                <CircularProgress size={20} />
                <Typography>読み込み中...</Typography>
              </Stack>
            )}

            {/* Tree Management */}
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">tmux構造管理</Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={handleCreateSession}
                  disabled={loading}
                >
                  新規セッション
                </Button>
              </Stack>

              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, minHeight: 400 }}>
                {hierarchy && Object.keys(hierarchy).length > 0 ? (
                  <List dense>
                    {Object.entries(hierarchy).map(([sessionName, sessionData]: [string, any]) => (
                      <Box key={sessionName}>
                        <ListItem
                          sx={{ py: 1 }}
                          secondaryAction={
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => handleCreateWindow(sessionName)}
                                title="ウィンドウを追加"
                                disabled={loading}
                              >
                                <AddBox fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteSession(sessionName)}
                                title="セッションを削除"
                                disabled={loading || Object.keys(hierarchy).length <= 1}
                                color="error"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          }
                        >
                          <ListItemIcon
                            onClick={() => toggleSessionExpansion(sessionName)}
                            sx={{ cursor: 'pointer', minWidth: 'auto', mr: 1 }}
                          >
                            {expandedSessions.has(sessionName) ? <ExpandMore /> : <ChevronRight />}
                          </ListItemIcon>
                          <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                            <FolderOpen sx={{ fontSize: 18 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={sessionName}
                            secondary={`${Object.keys(sessionData.windows || {}).length} ウィンドウ`}
                            primaryTypographyProps={{ fontWeight: 'bold' }}
                          />
                        </ListItem>

                        <Collapse in={expandedSessions.has(sessionName)} timeout="auto" unmountOnExit>
                          <List dense sx={{ pl: 4 }}>
                            {sessionData.windows && Object.entries(sessionData.windows).map(([windowIndex, windowData]: [string, any]) => (
                              <Box key={`${sessionName}-${windowIndex}`}>
                                <ListItem
                                  sx={{ py: 0.5 }}
                                  secondaryAction={
                                    <IconButton
                                      size="small"
                                      onClick={() => handleDeleteWindow(sessionName, windowIndex, windowData.name)}
                                      title="ウィンドウを削除"
                                      disabled={loading || Object.keys(sessionData.windows).length <= 1}
                                      color="error"
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  }
                                >
                                  <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                                    <Window sx={{ fontSize: 16 }} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={`${windowIndex}: ${windowData.name}`}
                                    secondary={`${Object.keys(windowData.panes || {}).length} ペイン`}
                                  />
                                </ListItem>

                                <List dense sx={{ pl: 4 }}>
                                  {windowData.panes && Object.entries(windowData.panes).map(([paneIndex, paneData]: [string, any]) => (
                                    <ListItem key={`${sessionName}-${windowIndex}-${paneIndex}`} sx={{ py: 0.25 }}>
                                      <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
                                        <ViewInAr sx={{ fontSize: 14 }} />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Typography variant="caption">
                                            ペイン {paneIndex}: {paneData.command}
                                            {paneData.active && ' (アクティブ)'}
                                          </Typography>
                                        }
                                        secondary={
                                          <Typography variant="caption" color="text.secondary">
                                            {paneData.size}
                                          </Typography>
                                        }
                                      />
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                            ))}
                          </List>
                        </Collapse>
                      </Box>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      セッションがありません
                    </Typography>
                  </Box>
                )}
              </Box>
            </Stack>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={onClose}
            startIcon={<Close />}
            disabled={loading}
          >
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, type: 'session', name: '', onConfirm: () => {} })}
      >
        <DialogTitle>
          {deleteDialog.type === 'session' ? 'セッション削除の確認' : 'ウィンドウ削除の確認'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {deleteDialog.type === 'session' 
              ? `セッション "${deleteDialog.name}" を削除しますか？`
              : `ウィンドウ "${deleteDialog.name}" を削除しますか？`
            }
            <br />
            この操作は取り消せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialog({ open: false, type: 'session', name: '', onConfirm: () => {} })}
          >
            キャンセル
          </Button>
          <Button 
            onClick={deleteDialog.onConfirm}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SettingsModal;
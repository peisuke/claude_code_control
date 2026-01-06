import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import {
  ExpandMore,
  ChevronRight,
  FolderOpen,
  Window as WindowIcon,
  Tab as TabIcon,
  Add,
  Delete,
  AddBox
} from '@mui/icons-material';
import { TmuxHierarchy } from '../../types';
import { tmuxAPI } from '../../services/api';

interface SessionTreeViewProps {
  hierarchy: TmuxHierarchy | null;
  selectedTarget: string;
  onTargetChange: (target: string) => void;
  onRefresh?: () => void;
}

interface DeleteDialogState {
  open: boolean;
  type: 'session' | 'window';
  name: string;
  sessionName: string;
  windowIndex?: string;
}

const initialDeleteDialog: DeleteDialogState = {
  open: false,
  type: 'session',
  name: '',
  sessionName: '',
  windowIndex: undefined
};

const SessionTreeView: React.FC<SessionTreeViewProps> = ({
  hierarchy,
  selectedTarget,
  onTargetChange,
  onRefresh
}) => {
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [expandedWindows, setExpandedWindows] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(initialDeleteDialog);

  // Parse current target
  const parseTarget = (target: string) => {
    const parts = target.split(':');
    const session = parts[0] || 'default';
    const windowPart = parts[1] || '';
    const windowPaneParts = windowPart.split('.');
    const window = windowPaneParts[0];
    const pane = windowPaneParts[1];
    return { session, window: window || undefined, pane: pane || undefined };
  };

  const buildTarget = (session: string, window?: string, pane?: string): string => {
    let target = session;
    if (window) {
      target += `:${window}`;
      if (pane) {
        target += `.${pane}`;
      }
    }
    return target;
  };

  const currentTarget = parseTarget(selectedTarget);
  const sessions = hierarchy?.sessions || {};

  // Auto-expand the currently selected session and window
  useEffect(() => {
    if (currentTarget.session) {
      setExpandedSessions(prev => ({ ...prev, [currentTarget.session]: true }));
    }
    if (currentTarget.session && currentTarget.window) {
      const windowKey = `${currentTarget.session}:${currentTarget.window}`;
      setExpandedWindows(prev => ({ ...prev, [windowKey]: true }));
    }
  }, [currentTarget.session, currentTarget.window]);

  const handleSessionToggle = (sessionName: string) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionName]: !prev[sessionName]
    }));
  };

  const handleWindowToggle = (sessionName: string, windowIndex: string) => {
    const windowKey = `${sessionName}:${windowIndex}`;
    setExpandedWindows(prev => ({
      ...prev,
      [windowKey]: !prev[windowKey]
    }));
  };

  const handleSessionClick = (sessionName: string) => {
    const sessionData = sessions[sessionName];
    if (sessionData && sessionData.windows) {
      const windowKeys = Object.keys(sessionData.windows).sort((a, b) => parseInt(a) - parseInt(b));
      if (windowKeys.length > 0) {
        const firstWindow = windowKeys[0];
        onTargetChange(buildTarget(sessionName, firstWindow));
      } else {
        onTargetChange(sessionName);
      }
    } else {
      onTargetChange(sessionName);
    }
  };

  const handleWindowClick = (sessionName: string, windowIndex: string) => {
    const windowData = sessions[sessionName]?.windows[windowIndex];
    if (windowData && windowData.panes && Object.keys(windowData.panes).length > 1) {
      const paneKeys = Object.keys(windowData.panes).sort((a, b) => parseInt(a) - parseInt(b));
      const firstPane = paneKeys[0];
      onTargetChange(buildTarget(sessionName, windowIndex, firstPane));
    } else {
      onTargetChange(buildTarget(sessionName, windowIndex));
    }
  };

  const handlePaneClick = (sessionName: string, windowIndex: string, paneIndex: string) => {
    onTargetChange(buildTarget(sessionName, windowIndex, paneIndex));
  };

  // Session/Window management handlers
  const handleCreateSession = async () => {
    const newSessionName = prompt('新しいセッション名を入力してください（空の場合は自動命名）:', '');

    if (newSessionName !== null) {
      try {
        setLoading(true);

        let sessionName = newSessionName.trim();

        // If empty, generate auto session name
        if (!sessionName) {
          const existingSessions = Object.keys(sessions);
          const numericSessions = existingSessions
            .filter(name => /^\d+$/.test(name))
            .map(name => parseInt(name, 10))
            .sort((a, b) => a - b);

          let nextNumber = 0;
          for (const num of numericSessions) {
            if (num === nextNumber) {
              nextNumber++;
            } else {
              break;
            }
          }
          sessionName = nextNumber.toString();
        }

        await tmuxAPI.createSession(sessionName);
        onRefresh?.();
      } catch (err) {
        console.error('Error creating session:', err);
        alert(err instanceof Error ? err.message : 'セッションの作成に失敗しました');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteSession = (sessionName: string) => {
    const sessionCount = Object.keys(sessions).length;
    if (sessionCount <= 1) {
      alert('最後のセッションは削除できません');
      return;
    }

    setDeleteDialog({
      open: true,
      type: 'session',
      name: sessionName,
      sessionName: sessionName,
      windowIndex: undefined
    });
  };

  const handleCreateWindow = async (sessionName: string) => {
    const windowName = prompt('新しいウィンドウ名を入力してください（空の場合は自動命名）:', '');
    if (windowName !== null) {
      try {
        setLoading(true);
        await tmuxAPI.createWindow(sessionName, windowName.trim() || undefined);
        onRefresh?.();
      } catch (err) {
        console.error('Error creating window:', err);
        alert(err instanceof Error ? err.message : 'ウィンドウの作成に失敗しました');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteWindow = (sessionName: string, windowIndex: string, windowName: string) => {
    const session = sessions[sessionName];
    const windowCount = Object.keys(session?.windows || {}).length;
    if (windowCount <= 1) {
      alert('最後のウィンドウは削除できません');
      return;
    }

    setDeleteDialog({
      open: true,
      type: 'window',
      name: `${windowIndex}: ${windowName}`,
      sessionName: sessionName,
      windowIndex: windowIndex
    });
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      if (deleteDialog.type === 'session') {
        await tmuxAPI.deleteSession(deleteDialog.sessionName);
      } else if (deleteDialog.windowIndex) {
        await tmuxAPI.deleteWindow(deleteDialog.sessionName, deleteDialog.windowIndex);
      }
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting:', err);
      alert(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setLoading(false);
      setDeleteDialog(initialDeleteDialog);
    }
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog(initialDeleteDialog);
  };

  if (!hierarchy || Object.keys(sessions).length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          セッションがありません
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <List dense sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {/* Add Session Button */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleCreateSession}
            disabled={loading}
            sx={{ pl: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <Add color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="新規セッション"
              primaryTypographyProps={{ variant: 'body2', color: 'primary' }}
            />
          </ListItemButton>
        </ListItem>

        {Object.entries(sessions).map(([sessionName, sessionData]) => {
          const isSessionExpanded = expandedSessions[sessionName];
          const isSessionSelected = currentTarget.session === sessionName && !currentTarget.window;
          const windows = sessionData.windows || {};
          const canDeleteSession = Object.keys(sessions).length > 1;

          return (
            <React.Fragment key={sessionName}>
              {/* Session Item */}
              <ListItem
                disablePadding
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateWindow(sessionName);
                      }}
                      title="ウィンドウを追加"
                      disabled={loading}
                    >
                      <AddBox fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(sessionName);
                      }}
                      title="セッションを削除"
                      disabled={loading || !canDeleteSession}
                      color="error"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemButton
                  selected={isSessionSelected}
                  onClick={() => handleSessionClick(sessionName)}
                  sx={{ pl: 1, pr: 9 }}
                >
                  <ListItemIcon
                    sx={{ minWidth: 32, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSessionToggle(sessionName);
                    }}
                  >
                    {isSessionExpanded ? <ExpandMore /> : <ChevronRight />}
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <FolderOpen color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={sessionName}
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 'medium' }}
                  />
                </ListItemButton>
              </ListItem>

            {/* Windows */}
            <Collapse in={isSessionExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding dense>
                {Object.entries(windows)
                  .sort(([, a], [, b]) => parseInt(a.index) - parseInt(b.index))
                  .map(([, window]) => {
                    const windowKey = `${sessionName}:${window.index}`;
                    const isWindowExpanded = expandedWindows[windowKey];
                    const isWindowSelected =
                      currentTarget.session === sessionName &&
                      currentTarget.window === window.index &&
                      !currentTarget.pane;
                    const panes = window.panes || {};
                    const hasPanes = Object.keys(panes).length > 1;

                    const canDeleteWindow = Object.keys(windows).length > 1;

                    return (
                      <React.Fragment key={windowKey}>
                        {/* Window Item */}
                        <ListItem
                          disablePadding
                          secondaryAction={
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWindow(sessionName, window.index, window.name);
                              }}
                              title="ウィンドウを削除"
                              disabled={loading || !canDeleteWindow}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemButton
                            selected={isWindowSelected}
                            onClick={() => handleWindowClick(sessionName, window.index)}
                            sx={{ pl: 4, pr: 6 }}
                          >
                            {hasPanes && (
                              <ListItemIcon
                                sx={{ minWidth: 32, cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWindowToggle(sessionName, window.index);
                                }}
                              >
                                {isWindowExpanded ? <ExpandMore /> : <ChevronRight />}
                              </ListItemIcon>
                            )}
                            {!hasPanes && <Box sx={{ width: 32, flexShrink: 0 }} />}
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <WindowIcon color="action" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${window.index}: ${window.name}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItemButton>
                        </ListItem>

                        {/* Panes */}
                        {hasPanes && (
                          <Collapse in={isWindowExpanded} timeout="auto" unmountOnExit>
                            <List component="div" disablePadding dense>
                              {Object.entries(panes)
                                .sort(([, a], [, b]) => parseInt(a.index) - parseInt(b.index))
                                .map(([, pane]) => {
                                  const isPaneSelected =
                                    currentTarget.session === sessionName &&
                                    currentTarget.window === window.index &&
                                    currentTarget.pane === pane.index;

                                  return (
                                    <ListItem key={`${windowKey}.${pane.index}`} disablePadding>
                                      <ListItemButton
                                        selected={isPaneSelected}
                                        onClick={() =>
                                          handlePaneClick(sessionName, window.index, pane.index)
                                        }
                                        sx={{ pl: 8 }}
                                      >
                                        <ListItemIcon sx={{ minWidth: 32 }}>
                                          <TabIcon fontSize="small" />
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={`${pane.index}: ${pane.command}`}
                                          primaryTypographyProps={{
                                            variant: 'body2',
                                            fontSize: '0.85rem'
                                          }}
                                        />
                                      </ListItemButton>
                                    </ListItem>
                                  );
                                })}
                            </List>
                          </Collapse>
                        )}
                      </React.Fragment>
                    );
                  })}
              </List>
            </Collapse>
          </React.Fragment>
        );
      })}
      </List>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleCloseDeleteDialog}
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
          <Button onClick={handleCloseDeleteDialog}>
            キャンセル
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SessionTreeView;

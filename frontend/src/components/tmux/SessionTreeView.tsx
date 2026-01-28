import React, { useState, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton
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
import { TmuxUtils } from '../../utils/tmux';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import { useSessionManagement } from '../../hooks/useSessionManagement';

interface SessionTreeViewProps {
  hierarchy: TmuxHierarchy | null;
  selectedTarget: string;
  onTargetChange: (target: string) => void;
  onRefresh?: () => void;
}

const SessionTreeView: React.FC<SessionTreeViewProps> = ({
  hierarchy,
  selectedTarget,
  onTargetChange,
  onRefresh
}) => {
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});
  const [expandedWindows, setExpandedWindows] = useState<Record<string, boolean>>({});

  const {
    loading,
    deleteDialog,
    handleCreateSession,
    handleDeleteSession,
    handleCreateWindow,
    handleDeleteWindow,
    handleConfirmDelete,
    handleCloseDeleteDialog
  } = useSessionManagement({ hierarchy, onRefresh });

  const currentTarget = TmuxUtils.parseTarget(selectedTarget);
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
        onTargetChange(TmuxUtils.buildTarget(sessionName, windowKeys[0]));
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
      onTargetChange(TmuxUtils.buildTarget(sessionName, windowIndex, paneKeys[0]));
    } else {
      onTargetChange(TmuxUtils.buildTarget(sessionName, windowIndex));
    }
  };

  const handlePaneClick = (sessionName: string, windowIndex: string, paneIndex: string) => {
    onTargetChange(TmuxUtils.buildTarget(sessionName, windowIndex, paneIndex));
  };

  const sessionEntries = Object.entries(sessions);

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

        {/* Empty state message */}
        {sessionEntries.length === 0 && (
          <ListItem>
            <ListItemText
              primary="セッションがありません"
              primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
            />
          </ListItem>
        )}

        {sessionEntries.map(([sessionName, sessionData]) => {
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

      <DeleteConfirmationDialog
        dialog={deleteDialog}
        loading={loading}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseDeleteDialog}
      />
    </>
  );
};

export default SessionTreeView;

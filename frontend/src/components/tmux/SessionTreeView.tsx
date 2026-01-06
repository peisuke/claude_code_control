import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography
} from '@mui/material';
import {
  ExpandMore,
  ChevronRight,
  FolderOpen,
  Window as WindowIcon,
  Tab as TabIcon
} from '@mui/icons-material';
import { TmuxHierarchy } from '../../types';

interface SessionTreeViewProps {
  hierarchy: TmuxHierarchy | null;
  selectedTarget: string;
  onTargetChange: (target: string) => void;
}

const SessionTreeView: React.FC<SessionTreeViewProps> = ({
  hierarchy,
  selectedTarget,
  onTargetChange
}) => {
  const [expandedSessions, setExpandedSessions] = React.useState<Record<string, boolean>>({});
  const [expandedWindows, setExpandedWindows] = React.useState<Record<string, boolean>>({});

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
  React.useEffect(() => {
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
    <List dense sx={{ width: '100%', bgcolor: 'background.paper' }}>
      {Object.entries(sessions).map(([sessionName, sessionData]) => {
        const isSessionExpanded = expandedSessions[sessionName];
        const isSessionSelected = currentTarget.session === sessionName && !currentTarget.window;
        const windows = sessionData.windows || {};

        return (
          <React.Fragment key={sessionName}>
            {/* Session Item */}
            <ListItem disablePadding>
              <ListItemButton
                selected={isSessionSelected}
                onClick={() => handleSessionClick(sessionName)}
                sx={{ pl: 1 }}
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

                    return (
                      <React.Fragment key={windowKey}>
                        {/* Window Item */}
                        <ListItem disablePadding>
                          <ListItemButton
                            selected={isWindowSelected}
                            onClick={() => handleWindowClick(sessionName, window.index)}
                            sx={{ pl: 4 }}
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
  );
};

export default SessionTreeView;

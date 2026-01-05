import { useCallback } from 'react';
import { useLocalStorageString, useLocalStorageBoolean } from './useLocalStorageState';
import { VIEW_MODES } from '../constants/ui';

interface ViewState {
  autoRefresh: boolean;
  viewMode: string;
}

interface ViewHandlers {
  handleViewModeToggle: () => void;
  handleAutoRefreshToggle: () => void;
  setAutoRefresh: (value: boolean) => void;
}

interface UseViewStateReturn {
  state: ViewState;
  handlers: ViewHandlers;
}

/**
 * Manages UI view state and mode switching
 * Single Responsibility: View mode management only
 */
export const useViewState = (): UseViewStateReturn => {
  const [autoRefresh, setAutoRefresh] = useLocalStorageBoolean('tmux-auto-refresh', true);
  const [viewMode, setViewMode] = useLocalStorageString('tmux-view-mode', VIEW_MODES.TMUX);

  // Handle view mode toggle
  const handleViewModeToggle = useCallback(() => {
    const newMode = viewMode === VIEW_MODES.TMUX ? VIEW_MODES.FILE : VIEW_MODES.TMUX;
    setViewMode(newMode);
  }, [viewMode, setViewMode]);

  // Handle auto-refresh toggle (logic moved to useAutoRefreshState)
  const handleAutoRefreshToggle = useCallback(() => {
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
  }, [autoRefresh, setAutoRefresh]);

  const state: ViewState = {
    autoRefresh,
    viewMode
  };

  const handlers: ViewHandlers = {
    handleViewModeToggle,
    handleAutoRefreshToggle,
    setAutoRefresh
  };

  return {
    state,
    handlers
  };
};
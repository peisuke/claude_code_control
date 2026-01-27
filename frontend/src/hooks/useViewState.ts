import { useCallback } from 'react';
import { useLocalStorageString } from './useLocalStorageState';
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
 * Note: Auto-refresh is now always enabled for scroll-based history loading
 */
export const useViewState = (): UseViewStateReturn => {
  // Auto-refresh is always enabled for scroll-based infinite history
  const autoRefresh = true;
  const [viewMode, setViewMode] = useLocalStorageString('tmux-view-mode', VIEW_MODES.TMUX);

  // Handle view mode toggle
  const handleViewModeToggle = useCallback(() => {
    const newMode = viewMode === VIEW_MODES.TMUX ? VIEW_MODES.FILE : VIEW_MODES.TMUX;
    setViewMode(newMode);
  }, [viewMode, setViewMode]);

  // Auto-refresh toggle is now a no-op (kept for backward compatibility)
  const handleAutoRefreshToggle = useCallback(() => {
    // Auto-refresh is always on, so this does nothing
  }, []);

  // setAutoRefresh is now a no-op (kept for backward compatibility)
  const setAutoRefresh = useCallback(() => {
    // Auto-refresh is always on, so this does nothing
  }, []);

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
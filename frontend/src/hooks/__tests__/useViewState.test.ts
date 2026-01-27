import { renderHook, act } from '@testing-library/react';
import { useViewState } from '../useViewState';
import { useLocalStorageString } from '../useLocalStorageState';
import { VIEW_MODES } from '../../constants/ui';

jest.mock('../useLocalStorageState');

const mockUseLocalStorageString = useLocalStorageString as jest.MockedFunction<typeof useLocalStorageString>;

describe('useViewState', () => {
  const mockSetViewMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalStorageString.mockReturnValue([VIEW_MODES.TMUX, mockSetViewMode]);
  });

  describe('initial state', () => {
    it('should have autoRefresh always true', () => {
      const { result } = renderHook(() => useViewState());
      expect(result.current.state.autoRefresh).toBe(true);
    });

    it('should have viewMode from localStorage', () => {
      const { result } = renderHook(() => useViewState());
      expect(result.current.state.viewMode).toBe(VIEW_MODES.TMUX);
    });

    it('should use correct localStorage key', () => {
      renderHook(() => useViewState());
      expect(mockUseLocalStorageString).toHaveBeenCalledWith('tmux-view-mode', VIEW_MODES.TMUX);
    });
  });

  describe('handleViewModeToggle', () => {
    it('should toggle from TMUX to FILE', () => {
      mockUseLocalStorageString.mockReturnValue([VIEW_MODES.TMUX, mockSetViewMode]);
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.handlers.handleViewModeToggle();
      });

      expect(mockSetViewMode).toHaveBeenCalledWith(VIEW_MODES.FILE);
    });

    it('should toggle from FILE to TMUX', () => {
      mockUseLocalStorageString.mockReturnValue([VIEW_MODES.FILE, mockSetViewMode]);
      const { result } = renderHook(() => useViewState());

      act(() => {
        result.current.handlers.handleViewModeToggle();
      });

      expect(mockSetViewMode).toHaveBeenCalledWith(VIEW_MODES.TMUX);
    });

    it('should return stable function reference', () => {
      const { result, rerender } = renderHook(() => useViewState());

      const handler1 = result.current.handlers.handleViewModeToggle;
      rerender();
      const handler2 = result.current.handlers.handleViewModeToggle;

      expect(handler1).toBe(handler2);
    });
  });

  describe('viewMode persistence', () => {
    it('should start with FILE mode if stored', () => {
      mockUseLocalStorageString.mockReturnValue([VIEW_MODES.FILE, mockSetViewMode]);
      const { result } = renderHook(() => useViewState());

      expect(result.current.state.viewMode).toBe(VIEW_MODES.FILE);
    });
  });
});

import { renderHook } from '@testing-library/react';
import { useAppVisibility } from '../useAppVisibility';

describe('useAppVisibility', () => {
  const mockOnAppResume = jest.fn();
  let addEventListenerSpy: jest.SpyInstance;
  let removeEventListenerSpy: jest.SpyInstance;
  let windowAddEventListenerSpy: jest.SpyInstance;
  let windowRemoveEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    addEventListenerSpy = jest.spyOn(document, 'addEventListener');
    removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    windowAddEventListenerSpy = jest.spyOn(window, 'addEventListener');
    windowRemoveEventListenerSpy = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
    windowAddEventListenerSpy.mockRestore();
    windowRemoveEventListenerSpy.mockRestore();
  });

  describe('event listener setup', () => {
    it('should add event listeners when enabled', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume, enabled: true }));

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(windowAddEventListenerSpy).toHaveBeenCalledWith('pageshow', expect.any(Function));
    });

    it('should not add event listeners when disabled', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume, enabled: false }));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
      expect(windowAddEventListenerSpy).not.toHaveBeenCalled();
    });

    it('should use enabled=true by default', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume }));

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useAppVisibility({ onAppResume: mockOnAppResume, enabled: true })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(windowRemoveEventListenerSpy).toHaveBeenCalledWith('pageshow', expect.any(Function));
    });
  });

  describe('visibilitychange event', () => {
    it('should call onAppResume when document becomes visible', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume }));

      const visibilityHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )?.[1];

      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      visibilityHandler?.();

      expect(mockOnAppResume).toHaveBeenCalledTimes(1);
    });

    it('should not call onAppResume when document is hidden', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume }));

      const visibilityHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )?.[1];

      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      visibilityHandler?.();

      expect(mockOnAppResume).not.toHaveBeenCalled();
    });
  });

  describe('focus event', () => {
    it('should call onAppResume on focus', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume }));

      const focusHandler = windowAddEventListenerSpy.mock.calls.find(
        call => call[0] === 'focus'
      )?.[1];

      focusHandler?.();

      expect(mockOnAppResume).toHaveBeenCalledTimes(1);
    });
  });

  describe('pageshow event', () => {
    it('should call onAppResume on persisted pageshow', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume }));

      const pageshowHandler = windowAddEventListenerSpy.mock.calls.find(
        call => call[0] === 'pageshow'
      )?.[1];

      pageshowHandler?.({ persisted: true } as PageTransitionEvent);

      expect(mockOnAppResume).toHaveBeenCalledTimes(1);
    });

    it('should not call onAppResume on non-persisted pageshow', () => {
      renderHook(() => useAppVisibility({ onAppResume: mockOnAppResume }));

      const pageshowHandler = windowAddEventListenerSpy.mock.calls.find(
        call => call[0] === 'pageshow'
      )?.[1];

      pageshowHandler?.({ persisted: false } as PageTransitionEvent);

      expect(mockOnAppResume).not.toHaveBeenCalled();
    });
  });

  describe('enabled toggle', () => {
    it('should add listeners when enabled changes to true', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useAppVisibility({ onAppResume: mockOnAppResume, enabled }),
        { initialProps: { enabled: false } }
      );

      expect(addEventListenerSpy).not.toHaveBeenCalled();

      rerender({ enabled: true });

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should remove listeners when enabled changes to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) => useAppVisibility({ onAppResume: mockOnAppResume, enabled }),
        { initialProps: { enabled: true } }
      );

      rerender({ enabled: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });
  });
});

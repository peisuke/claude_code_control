import { useEffect, useCallback } from 'react';

interface UseAppVisibilityOptions {
  onAppResume: () => void;
  enabled?: boolean;
}

/**
 * Hook to handle app visibility changes for mobile app resume detection
 * Monitors multiple events: visibilitychange, focus, pageshow for comprehensive mobile support
 */
export const useAppVisibility = ({ onAppResume, enabled = true }: UseAppVisibilityOptions) => {
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden) {
      onAppResume();
    }
  }, [onAppResume]);

  const handleFocus = useCallback(() => {
    onAppResume();
  }, [onAppResume]);

  const handlePageShow = useCallback((event: PageTransitionEvent) => {
    if (event.persisted) {
      onAppResume();
    }
  }, [onAppResume]);

  useEffect(() => {
    if (!enabled) return;

    // Add all event listeners for comprehensive mobile support
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [enabled, handleVisibilityChange, handleFocus, handlePageShow]);
};
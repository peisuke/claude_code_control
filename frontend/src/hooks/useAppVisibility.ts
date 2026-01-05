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
      console.log('App resumed (visibilitychange), attempting reconnection...');
      onAppResume();
    } else {
      console.log('App went to background (visibilitychange)');
    }
  }, [onAppResume]);

  const handleFocus = useCallback(() => {
    console.log('App focused, checking connection...');
    onAppResume();
  }, [onAppResume]);

  const handlePageShow = useCallback((event: PageTransitionEvent) => {
    if (event.persisted) {
      console.log('App resumed from cache (pageshow), forcing reconnection...');
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
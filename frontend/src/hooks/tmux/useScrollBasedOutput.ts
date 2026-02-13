import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { tmuxAPI } from '../../services/api';

interface UseScrollBasedOutputOptions {
  selectedTarget: string;
  isConnected: boolean;
  initialOutput?: string;
  onScrollPositionChange?: (isAtBottom: boolean) => void;
}

interface UseScrollBasedOutputReturn {
  output: string;
  isLoadingHistory: boolean;
  handleScroll: (e: React.UIEvent<HTMLElement>) => void;
  setOutput: (output: string) => void;
  outputRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: (force?: boolean) => void;
  isAtBottom: boolean;
  checkIsAtBottom: () => boolean;
  hasUserScrolledUp: () => boolean;
}

const SCROLL_THRESHOLD = 50; // pixels from top to trigger history load
const BOTTOM_THRESHOLD = 50; // pixels from bottom to consider "at bottom"
const HISTORY_LINES_PER_LOAD = 500; // lines to load each time

/**
 * Hook to manage scroll-based terminal output with infinite history loading
 * - Auto-scrolls when user is at the bottom
 * - Loads more history when scrolling to the top
 * - Maintains scroll position when loading history
 */
export const useScrollBasedOutput = ({
  selectedTarget,
  isConnected,
  initialOutput = '',
  onScrollPositionChange
}: UseScrollBasedOutputOptions): UseScrollBasedOutputReturn => {
  const [output, setOutput] = useState(initialOutput);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [totalLoadedLines, setTotalLoadedLines] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);
  const isLoadingRef = useRef(false);
  const lastScrollTopRef = useRef<number>(0);
  const lastScrollHeightRef = useRef<number>(0);  // Track scrollHeight to detect content changes
  const userScrolledUpRef = useRef(false);
  const isTargetSwitchingRef = useRef(false);
  const onScrollPositionChangeRef = useRef(onScrollPositionChange);
  onScrollPositionChangeRef.current = onScrollPositionChange;

  // Reset state when target changes
  const needsScrollToBottomRef = useRef(false);
  useEffect(() => {
    setIsAtBottom(true);
    setTotalLoadedLines(0);
    userScrolledUpRef.current = false;
    isTargetSwitchingRef.current = true;
    needsScrollToBottomRef.current = true;
    lastScrollTopRef.current = 0;
    onScrollPositionChangeRef.current?.(true);
    // Allow history loading after DOM settles
    requestAnimationFrame(() => {
      isTargetSwitchingRef.current = false;
    });
  }, [selectedTarget]);

  // Scroll to bottom after target switch, once DOM has updated with new content
  useLayoutEffect(() => {
    if (needsScrollToBottomRef.current && output) {
      needsScrollToBottomRef.current = false;
      const element = outputRef.current;
      if (element) {
        element.scrollTop = element.scrollHeight;
        lastScrollTopRef.current = element.scrollTop;
      }
    }
  }, [output]);

  // Check if user is at bottom of scroll
  const checkIfAtBottom = useCallback((element: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < BOTTOM_THRESHOLD;
  }, []);

  // Manual scroll to bottom function
  // force=true: Always scroll and reset user intent (for target change, manual refresh)
  // force=false: Only scroll if user hasn't scrolled up (for auto-updates)
  const scrollToBottom = useCallback((force = false) => {
    const element = outputRef.current;
    if (!element) return;

    // If not forced, respect user's scroll intent
    if (!force && userScrolledUpRef.current) {
      return;
    }

    element.scrollTop = element.scrollHeight;
    // Use ref to track state and only update if changed
    if (userScrolledUpRef.current) {
      setIsAtBottom(true);
    }
    // Only reset user intent when forced (explicit user action)
    if (force) {
      userScrolledUpRef.current = false;
    }
  }, []);

  // Check if currently at bottom (real-time check, not state-based)
  const checkIsAtBottom = useCallback(() => {
    const element = outputRef.current;
    if (!element) return true; // Default to true if no element
    return checkIfAtBottom(element);
  }, [checkIfAtBottom]);

  // Load more history when scrolling to top
  const loadMoreHistory = useCallback(async () => {
    if (!isConnected || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setIsLoadingHistory(true);

    try {
      const element = outputRef.current;
      if (!element) return;

      // Save current scroll position
      previousScrollHeight.current = element.scrollHeight;

      // Calculate how many lines to load
      const linesToLoad = totalLoadedLines + HISTORY_LINES_PER_LOAD;

      // Load history
      const response = await tmuxAPI.getOutput(selectedTarget, true, linesToLoad);
      const newOutput = response.content;

      setOutput(newOutput);
      setTotalLoadedLines(linesToLoad);

      // Restore scroll position after content is loaded
      setTimeout(() => {
        if (element) {
          const newScrollHeight = element.scrollHeight;
          const scrollDiff = newScrollHeight - previousScrollHeight.current;
          element.scrollTop = scrollDiff;
          lastScrollTopRef.current = scrollDiff;
        }
        setIsLoadingHistory(false);
        isLoadingRef.current = false;
      }, 0);

    } catch {
      setIsLoadingHistory(false);
      isLoadingRef.current = false;
    }
  }, [isConnected, selectedTarget, totalLoadedLines]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const element = e.currentTarget;

    // Detect if this scroll is due to content change (scrollHeight changed significantly)
    const scrollHeightDiff = Math.abs(element.scrollHeight - lastScrollHeightRef.current);
    const isContentChange = scrollHeightDiff > 100;
    lastScrollHeightRef.current = element.scrollHeight;

    // Always track scroll position intent, even during content changes
    const atBottom = checkIfAtBottom(element);
    const wasAtBottom = !userScrolledUpRef.current;

    if (atBottom !== wasAtBottom) {
      setIsAtBottom(atBottom);
      userScrolledUpRef.current = !atBottom;
      onScrollPositionChangeRef.current?.(atBottom);
    }

    const previousScrollTop = lastScrollTopRef.current;
    lastScrollTopRef.current = element.scrollTop;

    // If content just changed, don't trigger history loading
    // (scroll position tracking above still runs to preserve user intent)
    if (isContentChange) {
      return;
    }

    // Check if at top and should load more history (only when scrolling upward)
    const isScrollingUp = element.scrollTop < previousScrollTop;

    if (isScrollingUp && element.scrollTop < SCROLL_THRESHOLD && !isLoadingRef.current && !isTargetSwitchingRef.current) {
      loadMoreHistory();
    }
  }, [checkIfAtBottom, loadMoreHistory]);

  // Update output (called from WebSocket or manual refresh)
  const updateOutput = useCallback((newOutput: string) => {
    setOutput(newOutput);
    // Reset loaded lines count when getting fresh output
    setTotalLoadedLines(0);
  }, []);

  const hasUserScrolledUp = useCallback(() => userScrolledUpRef.current, []);

  return {
    output,
    isLoadingHistory,
    handleScroll,
    setOutput: updateOutput,
    outputRef,
    scrollToBottom,
    isAtBottom,
    checkIsAtBottom,
    hasUserScrolledUp
  };
};

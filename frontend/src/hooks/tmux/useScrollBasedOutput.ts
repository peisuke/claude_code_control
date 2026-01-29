import { useState, useCallback, useRef, useEffect } from 'react';
import { tmuxAPI } from '../../services/api';

interface UseScrollBasedOutputOptions {
  selectedTarget: string;
  isConnected: boolean;
  initialOutput?: string;
}

interface UseScrollBasedOutputReturn {
  output: string;
  isLoadingHistory: boolean;
  handleScroll: (e: React.UIEvent<HTMLElement>) => void;
  setOutput: (output: string) => void;
  outputRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
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
  initialOutput = ''
}: UseScrollBasedOutputOptions): UseScrollBasedOutputReturn => {
  const [output, setOutput] = useState(initialOutput);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [totalLoadedLines, setTotalLoadedLines] = useState(0);
  const outputRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);
  const isLoadingRef = useRef(false);
  const userScrolledUpRef = useRef(false);

  // Reset state when target changes
  useEffect(() => {
    setIsAtBottom(true);
    setTotalLoadedLines(0);
    userScrolledUpRef.current = false;
  }, [selectedTarget]);

  // Check if user is at bottom of scroll
  const checkIfAtBottom = useCallback((element: HTMLElement) => {
    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < BOTTOM_THRESHOLD;
  }, []);

  // Manual scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const element = outputRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
      setIsAtBottom(true);
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
        }
      }, 0);

    } catch {
      // Silently fail history loading
    } finally {
      setIsLoadingHistory(false);
      isLoadingRef.current = false;
    }
  }, [isConnected, selectedTarget, totalLoadedLines]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const element = e.currentTarget;

    // Track if user is at bottom
    const atBottom = checkIfAtBottom(element);
    setIsAtBottom(atBottom);
    userScrolledUpRef.current = !atBottom;

    // Check if at top and should load more history
    if (element.scrollTop < SCROLL_THRESHOLD && !isLoadingRef.current) {
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

import { useEffect, useRef, useCallback } from 'react';
import { tmuxAPI } from '../../services/api';
import { TERMINAL } from '../../constants/ui';

// Approximate character dimensions for monospace fonts
// These ratios are typical for common monospace fonts (Monaco, Menlo, Ubuntu Mono)
const CHAR_WIDTH_RATIO = 0.6; // character width ≈ 60% of font size
const LINE_HEIGHT_RATIO = 1.2; // line height ≈ 120% of font size

/**
 * Get the current font size in pixels based on viewport width.
 * Matches MUI breakpoints: xs (<600), sm (600-899), md (900+)
 */
function getCurrentFontSize(): number {
  const width = window.innerWidth;
  if (width >= 900) return parseInt(TERMINAL.FONT_SIZES.md);
  if (width >= 600) return parseInt(TERMINAL.FONT_SIZES.sm);
  return parseInt(TERMINAL.FONT_SIZES.xs);
}

/**
 * Calculate terminal dimensions (cols x rows) from pixel dimensions
 */
function calculateTerminalSize(
  containerWidth: number,
  containerHeight: number,
  fontSize: number
): { cols: number; rows: number } {
  const charWidth = fontSize * CHAR_WIDTH_RATIO;
  const lineHeight = fontSize * LINE_HEIGHT_RATIO;

  // Account for padding (p: 2 = 16px on each side)
  const padding = 16 * 2;
  const availableWidth = containerWidth - padding;
  const availableHeight = containerHeight - padding;

  const cols = Math.floor(availableWidth / charWidth);
  const rows = Math.floor(availableHeight / lineHeight);

  return { cols: Math.max(20, cols), rows: Math.max(24, rows) };
}

interface UseTerminalResizeOptions {
  outputRef: React.RefObject<HTMLDivElement>;
  selectedTarget: string;
  isConnected: boolean;
}

/**
 * Hook to sync tmux pane size with the frontend terminal display area.
 * Uses ResizeObserver to detect container size changes and sends
 * resize commands to tmux.
 */
export const useTerminalResize = ({
  outputRef,
  selectedTarget,
  isConnected,
}: UseTerminalResizeOptions): void => {
  const lastSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendResize = useCallback(async (cols: number, rows: number) => {
    if (!isConnected || !selectedTarget) return;

    // Skip if size hasn't changed
    if (lastSizeRef.current?.cols === cols && lastSizeRef.current?.rows === rows) {
      return;
    }

    const previousSize = lastSizeRef.current;
    lastSizeRef.current = { cols, rows };

    try {
      await tmuxAPI.resizePane(selectedTarget, cols, rows);
    } catch {
      // Reset on failure so the next attempt can retry
      lastSizeRef.current = previousSize;
    }
  }, [isConnected, selectedTarget]);

  // Observe container size changes
  useEffect(() => {
    const element = outputRef.current;
    if (!element || !isConnected) return;

    const handleResize = () => {
      // Debounce resize calls
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        // Skip when container is hidden (display: none gives 0 dimensions)
        if (element.clientWidth === 0 || element.clientHeight === 0) return;

        const fontSize = getCurrentFontSize();
        const { cols, rows } = calculateTerminalSize(
          element.clientWidth,
          element.clientHeight,
          fontSize
        );
        sendResize(cols, rows);
      }, 300);
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(element);

    // Send initial size
    handleResize();

    return () => {
      observer.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [outputRef, isConnected, sendResize]);

  // Re-send size when target changes
  useEffect(() => {
    if (!isConnected || !selectedTarget || !outputRef.current) return;

    // Reset last size to force re-send
    lastSizeRef.current = null;

    const fontSize = getCurrentFontSize();
    const { cols, rows } = calculateTerminalSize(
      outputRef.current.clientWidth,
      outputRef.current.clientHeight,
      fontSize
    );
    sendResize(cols, rows);
  }, [selectedTarget, isConnected, sendResize, outputRef]);
};

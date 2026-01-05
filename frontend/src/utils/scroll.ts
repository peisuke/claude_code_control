import { TIMING } from '../constants/ui';

/**
 * Scroll utilities for terminal output
 */
export class ScrollUtils {
  /**
   * Smoothly scroll element to bottom
   */
  static scrollToBottom(element: HTMLElement | null, delay: number = TIMING.SCROLL_ANIMATION_DELAY): void {
    if (!element) return;
    
    setTimeout(() => {
      element.scrollTop = element.scrollHeight;
    }, delay);
  }

  /**
   * Smart scroll - only scroll if content overflows
   */
  static smartScrollToBottom(element: HTMLElement | null): void {
    if (!element) return;

    const { scrollHeight, clientHeight } = element;
    if (scrollHeight > clientHeight) {
      element.scrollTop = scrollHeight - clientHeight;
    }
  }

  /**
   * Check if element is scrolled to bottom (within tolerance)
   */
  static isAtBottom(element: HTMLElement | null, tolerance: number = 10): boolean {
    if (!element) return true;

    const { scrollTop, scrollHeight, clientHeight } = element;
    return scrollHeight - scrollTop - clientHeight <= tolerance;
  }

  /**
   * Auto-scroll only if user is at bottom
   */
  static autoScrollIfAtBottom(element: HTMLElement | null): void {
    if (!element) return;

    if (ScrollUtils.isAtBottom(element)) {
      ScrollUtils.scrollToBottom(element);
    }
  }
}
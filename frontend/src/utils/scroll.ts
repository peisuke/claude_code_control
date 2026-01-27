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
}
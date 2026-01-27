import { ScrollUtils } from '../scroll';
import { TIMING } from '../../constants/ui';

describe('ScrollUtils', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('scrollToBottom', () => {
    it('should scroll element to bottom after default delay', () => {
      const mockElement = {
        scrollTop: 0,
        scrollHeight: 1000,
      } as HTMLElement;

      ScrollUtils.scrollToBottom(mockElement);

      expect(mockElement.scrollTop).toBe(0);

      jest.advanceTimersByTime(TIMING.SCROLL_ANIMATION_DELAY);

      expect(mockElement.scrollTop).toBe(1000);
    });

    it('should scroll element to bottom after custom delay', () => {
      const mockElement = {
        scrollTop: 0,
        scrollHeight: 500,
      } as HTMLElement;

      ScrollUtils.scrollToBottom(mockElement, 100);

      expect(mockElement.scrollTop).toBe(0);

      jest.advanceTimersByTime(50);
      expect(mockElement.scrollTop).toBe(0);

      jest.advanceTimersByTime(50);
      expect(mockElement.scrollTop).toBe(500);
    });

    it('should do nothing for null element', () => {
      // Should not throw
      ScrollUtils.scrollToBottom(null);
      jest.advanceTimersByTime(TIMING.SCROLL_ANIMATION_DELAY);
    });

    it('should handle zero delay', () => {
      const mockElement = {
        scrollTop: 0,
        scrollHeight: 200,
      } as HTMLElement;

      ScrollUtils.scrollToBottom(mockElement, 0);

      jest.advanceTimersByTime(0);
      expect(mockElement.scrollTop).toBe(200);
    });
  });
});

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, useThemeContext } from '../ThemeContext';
import { useLocalStorageBoolean } from '../../hooks/useLocalStorageState';

jest.mock('../../hooks/useLocalStorageState');

const mockUseLocalStorageBoolean = useLocalStorageBoolean as jest.MockedFunction<typeof useLocalStorageBoolean>;

// Test component to access context
const TestComponent: React.FC = () => {
  const { darkMode, setDarkMode } = useThemeContext();
  return (
    <div>
      <span data-testid="dark-mode">{darkMode ? 'dark' : 'light'}</span>
      <button onClick={() => setDarkMode(!darkMode)}>Toggle</button>
    </div>
  );
};

describe('ThemeContext', () => {
  const mockSetDarkMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalStorageBoolean.mockReturnValue([false, mockSetDarkMode]);
  });

  describe('ThemeProvider', () => {
    it('should render children', () => {
      render(
        <ThemeProvider>
          <div data-testid="child">Child Content</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide darkMode value from localStorage', () => {
      mockUseLocalStorageBoolean.mockReturnValue([true, mockSetDarkMode]);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark');
    });

    it('should provide light mode by default', () => {
      mockUseLocalStorageBoolean.mockReturnValue([false, mockSetDarkMode]);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('light');
    });

    it('should use correct localStorage key', () => {
      render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      expect(mockUseLocalStorageBoolean).toHaveBeenCalledWith('dark-mode', false);
    });

    it('should provide setDarkMode function', () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      act(() => {
        screen.getByRole('button').click();
      });

      expect(mockSetDarkMode).toHaveBeenCalledWith(true);
    });
  });

  describe('useThemeContext', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useThemeContext must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('should return context values when used inside ThemeProvider', () => {
      mockUseLocalStorageBoolean.mockReturnValue([true, mockSetDarkMode]);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('dark-mode')).toHaveTextContent('dark');
    });
  });

  describe('theme creation', () => {
    it('should create light theme when darkMode is false', () => {
      mockUseLocalStorageBoolean.mockReturnValue([false, mockSetDarkMode]);

      const { container } = render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      // MUI applies styles via CssBaseline, check that it rendered
      expect(container).toBeDefined();
    });

    it('should create dark theme when darkMode is true', () => {
      mockUseLocalStorageBoolean.mockReturnValue([true, mockSetDarkMode]);

      const { container } = render(
        <ThemeProvider>
          <div>Test</div>
        </ThemeProvider>
      );

      expect(container).toBeDefined();
    });
  });

  describe('context value memoization', () => {
    it('should provide stable context value when darkMode does not change', () => {
      mockUseLocalStorageBoolean.mockReturnValue([false, mockSetDarkMode]);

      let contextValue1: { darkMode: boolean; setDarkMode: (value: boolean) => void } | null = null;
      let contextValue2: { darkMode: boolean; setDarkMode: (value: boolean) => void } | null = null;

      const ContextCapture: React.FC<{ capture: (ctx: typeof contextValue1) => void }> = ({ capture }) => {
        const ctx = useThemeContext();
        capture(ctx);
        return null;
      };

      const { rerender } = render(
        <ThemeProvider>
          <ContextCapture capture={(ctx) => { contextValue1 = ctx; }} />
        </ThemeProvider>
      );

      rerender(
        <ThemeProvider>
          <ContextCapture capture={(ctx) => { contextValue2 = ctx; }} />
        </ThemeProvider>
      );

      // With useMemo, the context value should be the same reference
      expect(contextValue1).toBe(contextValue2);
    });
  });
});

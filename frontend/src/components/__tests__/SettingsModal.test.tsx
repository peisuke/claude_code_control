import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsModal from '../SettingsModal';
import { useThemeContext } from '../../contexts/ThemeContext';

jest.mock('../../contexts/ThemeContext');

const mockUseThemeContext = useThemeContext as jest.MockedFunction<typeof useThemeContext>;

describe('SettingsModal', () => {
  const mockOnClose = jest.fn();
  const mockSetDarkMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThemeContext.mockReturnValue({
      darkMode: false,
      setDarkMode: mockSetDarkMode,
    });
  });

  describe('rendering', () => {
    it('should render when isOpen is true', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('設定')).toBeInTheDocument();
    });

    it('should not render dialog content when isOpen is false', () => {
      render(<SettingsModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByText('設定')).not.toBeInTheDocument();
    });

    it('should display dark mode option', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('ダークモード')).toBeInTheDocument();
      expect(screen.getByText('画面の配色をダークテーマに切り替えます')).toBeInTheDocument();
    });

    it('should display close button', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('閉じる')).toBeInTheDocument();
    });
  });

  describe('dark mode toggle', () => {
    it('should show switch as unchecked when darkMode is false', () => {
      mockUseThemeContext.mockReturnValue({
        darkMode: false,
        setDarkMode: mockSetDarkMode,
      });

      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const switchElement = screen.getByRole('checkbox');
      expect(switchElement).not.toBeChecked();
    });

    it('should show switch as checked when darkMode is true', () => {
      mockUseThemeContext.mockReturnValue({
        darkMode: true,
        setDarkMode: mockSetDarkMode,
      });

      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const switchElement = screen.getByRole('checkbox');
      expect(switchElement).toBeChecked();
    });

    it('should call setDarkMode with true when toggling on', () => {
      mockUseThemeContext.mockReturnValue({
        darkMode: false,
        setDarkMode: mockSetDarkMode,
      });

      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const switchElement = screen.getByRole('checkbox');
      fireEvent.click(switchElement);

      expect(mockSetDarkMode).toHaveBeenCalledWith(true);
    });

    it('should call setDarkMode with false when toggling off', () => {
      mockUseThemeContext.mockReturnValue({
        darkMode: true,
        setDarkMode: mockSetDarkMode,
      });

      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      const switchElement = screen.getByRole('checkbox');
      fireEvent.click(switchElement);

      expect(mockSetDarkMode).toHaveBeenCalledWith(false);
    });
  });

  describe('close behavior', () => {
    it('should call onClose when close button clicked', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      fireEvent.click(screen.getByText('閉じる'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop clicked', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      // Click on the backdrop (MUI Dialog backdrop)
      const backdrop = document.querySelector('.MuiBackdrop-root');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when pressing Escape', () => {
      render(<SettingsModal isOpen={true} onClose={mockOnClose} />);

      // MUI Dialog listens for Escape on the dialog itself
      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});

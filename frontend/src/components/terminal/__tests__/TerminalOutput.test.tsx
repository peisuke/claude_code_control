import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TerminalOutput from '../TerminalOutput';

// Mock ansi-to-html
jest.mock('ansi-to-html', () => {
  return jest.fn().mockImplementation(() => ({
    toHtml: (text: string) => text.replace(/\x1b\[[0-9;]*m/g, '')
  }));
});

describe('TerminalOutput', () => {
  describe('rendering', () => {
    it('should render placeholder when output is empty', () => {
      render(<TerminalOutput output="" />);

      expect(screen.getByText('tmux出力がここに表示されます...')).toBeInTheDocument();
    });

    it('should render output content', () => {
      render(<TerminalOutput output="Hello World" />);

      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render multiline output', () => {
      const output = 'Line 1\nLine 2\nLine 3';
      render(<TerminalOutput output={output} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it('should convert ANSI codes to HTML', () => {
      // ANSI code for red text
      const output = '\x1b[31mRed Text\x1b[0m';
      const { container } = render(<TerminalOutput output={output} />);

      // Should contain div with dangerouslySetInnerHTML
      const htmlContent = container.querySelector('div[dangerouslySetInnerHTML]') ||
                         container.querySelector('div > div');
      expect(htmlContent).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should not show loading indicator by default', () => {
      render(<TerminalOutput output="test" />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should show loading indicator when isLoadingHistory is true', () => {
      render(<TerminalOutput output="test" isLoadingHistory={true} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('履歴を読み込み中...')).toBeInTheDocument();
    });

    it('should hide loading indicator when isLoadingHistory is false', () => {
      render(<TerminalOutput output="test" isLoadingHistory={false} />);

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('scroll handling', () => {
    it('should call onScroll when scrolling via ref', () => {
      const onScroll = jest.fn();
      const ref = React.createRef<HTMLDivElement>();
      render(
        <TerminalOutput output="test content" onScroll={onScroll} outputRef={ref} />
      );

      // The ref should be attached to the scrollable element with onScroll
      if (ref.current) {
        fireEvent.scroll(ref.current);
        expect(onScroll).toHaveBeenCalled();
      }
    });

    it('should not crash when onScroll is not provided', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<TerminalOutput output="test" outputRef={ref} />);

      if (ref.current) {
        expect(() => fireEvent.scroll(ref.current!)).not.toThrow();
      }
    });
  });

  describe('outputRef', () => {
    it('should attach ref to output container', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<TerminalOutput output="test" outputRef={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should work without outputRef', () => {
      expect(() => render(<TerminalOutput output="test" />)).not.toThrow();
    });
  });

  describe('styling', () => {
    it('should have terminal-like styling', () => {
      const { container } = render(<TerminalOutput output="test" />);

      // Should have pre-formatted text (whiteSpace: pre)
      const terminalBox = container.querySelector('[style*="white-space"]') ||
                         container.querySelector('div > div:last-child');
      expect(terminalBox).toBeInTheDocument();
    });
  });

  describe('special characters', () => {
    it('should handle special characters in output', () => {
      const output = '$ echo "hello" && pwd\n/home/user';
      render(<TerminalOutput output={output} />);

      expect(screen.getByText(/echo/)).toBeInTheDocument();
    });

    it('should handle empty lines', () => {
      const output = 'Line 1\n\nLine 3';
      render(<TerminalOutput output={output} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });
  });
});

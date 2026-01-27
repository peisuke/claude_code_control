import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FileOperations from '../FileOperations';

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children, language }: { children: string; language: string }) => (
    <pre data-testid="syntax-highlighter" data-language={language}>{children}</pre>
  )
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  tomorrow: {}
}));

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage });

describe('FileOperations', () => {
  const defaultProps = {
    selectedFile: '/path/to/file.txt',
    onFileDeselect: jest.fn(),
    fileContent: 'Hello World',
    isImage: false,
    mimeType: '',
    loading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render file name', () => {
      render(<FileOperations {...defaultProps} />);

      expect(screen.getByText('file.txt')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<FileOperations {...defaultProps} />);

      expect(screen.getByTitle('閉じる')).toBeInTheDocument();
    });

    it('should render file content in syntax highlighter', () => {
      render(<FileOperations {...defaultProps} />);

      expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when loading', () => {
      render(<FileOperations {...defaultProps} loading={true} />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('ファイルを読み込み中...')).toBeInTheDocument();
    });

    it('should not show file content when loading', () => {
      render(<FileOperations {...defaultProps} loading={true} />);

      expect(screen.queryByTestId('syntax-highlighter')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error message when error occurs', () => {
      render(<FileOperations {...defaultProps} error="Failed to load file" />);

      expect(screen.getByText('Failed to load file')).toBeInTheDocument();
    });

    it('should still show close button in error state', () => {
      render(<FileOperations {...defaultProps} error="Error occurred" />);

      expect(screen.getByTitle('閉じる')).toBeInTheDocument();
    });

    it('should still show file name in error state', () => {
      render(<FileOperations {...defaultProps} error="Error" />);

      expect(screen.getByText('file.txt')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onFileDeselect when close button clicked', () => {
      render(<FileOperations {...defaultProps} />);

      fireEvent.click(screen.getByTitle('閉じる'));

      expect(defaultProps.onFileDeselect).toHaveBeenCalledTimes(1);
    });

    it('should remove from session storage when closed', () => {
      render(<FileOperations {...defaultProps} />);

      fireEvent.click(screen.getByTitle('閉じる'));

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('fileViewSelectedFile');
    });
  });

  describe('image display', () => {
    it('should render image when isImage is true', () => {
      render(
        <FileOperations
          {...defaultProps}
          selectedFile="/path/to/image.png"
          isImage={true}
          mimeType="image/png"
          fileContent="base64encodedcontent"
        />
      );

      const image = screen.getByRole('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'data:image/png;base64,base64encodedcontent');
    });

    it('should not show syntax highlighter for images', () => {
      render(
        <FileOperations
          {...defaultProps}
          isImage={true}
          mimeType="image/png"
          fileContent="base64content"
        />
      );

      expect(screen.queryByTestId('syntax-highlighter')).not.toBeInTheDocument();
    });
  });

  describe('language detection', () => {
    it('should detect JavaScript files', () => {
      render(<FileOperations {...defaultProps} selectedFile="/path/to/app.js" />);

      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveAttribute('data-language', 'javascript');
    });

    it('should detect TypeScript files', () => {
      render(<FileOperations {...defaultProps} selectedFile="/path/to/app.ts" />);

      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveAttribute('data-language', 'typescript');
    });

    it('should detect Python files', () => {
      render(<FileOperations {...defaultProps} selectedFile="/path/to/script.py" />);

      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveAttribute('data-language', 'python');
    });

    it('should detect JSON files', () => {
      render(<FileOperations {...defaultProps} selectedFile="/path/to/config.json" />);

      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveAttribute('data-language', 'json');
    });

    it('should detect YAML files', () => {
      render(<FileOperations {...defaultProps} selectedFile="/path/to/config.yaml" />);

      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveAttribute('data-language', 'yaml');
    });

    it('should detect shell scripts', () => {
      render(<FileOperations {...defaultProps} selectedFile="/path/to/script.sh" />);

      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveAttribute('data-language', 'bash');
    });

    it('should default to text for unknown extensions', () => {
      render(<FileOperations {...defaultProps} selectedFile="/path/to/file.xyz" />);

      const highlighter = screen.getByTestId('syntax-highlighter');
      expect(highlighter).toHaveAttribute('data-language', 'text');
    });
  });

  describe('empty file handling', () => {
    it('should show placeholder for empty files', () => {
      render(<FileOperations {...defaultProps} fileContent="" />);

      expect(screen.getByText('(空のファイル)')).toBeInTheDocument();
    });
  });

  describe('no file selected', () => {
    it('should show content with syntax highlighter when fileContent is empty string', () => {
      render(
        <FileOperations
          selectedFile="/path/to/file.txt"
          onFileDeselect={jest.fn()}
          fileContent=""
        />
      );

      // Empty string means file is loaded but empty
      expect(screen.getByText('(空のファイル)')).toBeInTheDocument();
    });
  });

  describe('file extensions', () => {
    const extensionTests = [
      { ext: 'jsx', lang: 'jsx' },
      { ext: 'tsx', lang: 'tsx' },
      { ext: 'rb', lang: 'ruby' },
      { ext: 'go', lang: 'go' },
      { ext: 'rs', lang: 'rust' },
      { ext: 'cpp', lang: 'cpp' },
      { ext: 'java', lang: 'java' },
      { ext: 'css', lang: 'css' },
      { ext: 'html', lang: 'html' },
      { ext: 'md', lang: 'markdown' },
      { ext: 'sql', lang: 'sql' }
    ];

    extensionTests.forEach(({ ext, lang }) => {
      it(`should detect .${ext} as ${lang}`, () => {
        render(<FileOperations {...defaultProps} selectedFile={`/path/file.${ext}`} />);

        const highlighter = screen.getByTestId('syntax-highlighter');
        expect(highlighter).toHaveAttribute('data-language', lang);
      });
    });
  });
});

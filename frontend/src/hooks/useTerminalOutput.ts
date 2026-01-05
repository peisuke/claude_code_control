import { useState, useCallback, useRef } from 'react';
import { ScrollUtils } from '../utils/scroll';

interface UseTerminalOutputReturn {
  output: string;
  setOutput: (output: string) => void;
  outputRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
  isAtBottom: () => boolean;
  autoScrollIfAtBottom: () => void;
  clearOutput: () => void;
}

/**
 * Hook to manage terminal output and scrolling behavior
 */
export const useTerminalOutput = (): UseTerminalOutputReturn => {
  const [output, setOutput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    ScrollUtils.scrollToBottom(outputRef.current);
  }, []);

  const isAtBottom = useCallback((): boolean => {
    return ScrollUtils.isAtBottom(outputRef.current);
  }, []);

  const autoScrollIfAtBottom = useCallback(() => {
    ScrollUtils.autoScrollIfAtBottom(outputRef.current);
  }, []);

  const clearOutput = useCallback(() => {
    setOutput('');
  }, []);

  return {
    output,
    setOutput,
    outputRef,
    scrollToBottom,
    isAtBottom,
    autoScrollIfAtBottom,
    clearOutput,
  };
};
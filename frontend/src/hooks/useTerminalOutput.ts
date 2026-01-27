import { useState, useCallback, useRef } from 'react';
import { ScrollUtils } from '../utils/scroll';

interface UseTerminalOutputReturn {
  output: string;
  setOutput: (output: string) => void;
  outputRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
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

  return {
    output,
    setOutput,
    outputRef,
    scrollToBottom,
  };
};
import { useState, useCallback, useRef } from 'react';
import { tmuxAPI } from '../services/api';
import { ScrollUtils } from '../utils/scroll';

interface UseTmuxReturn {
  sendCommand: (command: string, target?: string) => Promise<void>;
  sendEnter: (target?: string) => Promise<void>;
  getOutput: (target?: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  // Terminal output state (absorbed from useTerminalOutput)
  output: string;
  setOutput: (output: string) => void;
  outputRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: () => void;
}

export const useTmux = (): UseTmuxReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    ScrollUtils.scrollToBottom(outputRef.current);
  }, []);

  const sendCommand = useCallback(async (command: string, target?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await tmuxAPI.sendCommand(command, target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send command');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendEnter = useCallback(async (target?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await tmuxAPI.sendEnter(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send enter');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getOutput = useCallback(async (target?: string, includeHistory: boolean = false, lines?: number): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await tmuxAPI.getOutput(target, includeHistory, lines);
      return result.content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get output';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendCommand,
    sendEnter,
    getOutput,
    isLoading,
    error,
    output,
    setOutput,
    outputRef,
    scrollToBottom,
  };
};

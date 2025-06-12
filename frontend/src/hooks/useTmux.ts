import { useState, useCallback } from 'react';
import { tmuxAPI } from '../services/api';

interface UseTmuxReturn {
  sendCommand: (command: string, target?: string) => Promise<void>;
  sendEnter: (target?: string) => Promise<void>;
  getOutput: (target?: string) => Promise<string>;
  getSessions: () => Promise<string[]>;
  isLoading: boolean;
  error: string | null;
}

export const useTmux = (): UseTmuxReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const getOutput = useCallback(async (target?: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const output = await tmuxAPI.getOutput(target);
      return output.content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get output';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSessions = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await tmuxAPI.getSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get sessions');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendCommand,
    sendEnter,
    getOutput,
    getSessions,
    isLoading,
    error,
  };
};
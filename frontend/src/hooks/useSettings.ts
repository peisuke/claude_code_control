import { useState, useEffect, useCallback } from 'react';
import { TmuxSettings } from '../types';
import { tmuxAPI } from '../services/api';

interface UseSettingsReturn {
  settings: TmuxSettings;
  updateSettings: (newSettings: TmuxSettings) => Promise<void>;
  testConnection: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export const useSettings = (): UseSettingsReturn => {
  const [settings, setSettings] = useState<TmuxSettings>({
    session_name: 'default',
    auto_create_session: true,
    capture_history: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const loadedSettings = await tmuxAPI.getSettings();
      setSettings(loadedSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: TmuxSettings) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await tmuxAPI.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await tmuxAPI.testConnection();
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    updateSettings,
    testConnection,
    isLoading,
    error,
  };
};
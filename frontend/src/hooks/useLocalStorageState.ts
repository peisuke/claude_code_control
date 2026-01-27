import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to manage state that persists in localStorage
 * @internal Used only by useLocalStorageString and useLocalStorageBoolean
 */
function useLocalStorageState<T>(
  key: string, 
  defaultValue: T,
  serializer: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  } = {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  }
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      return serializer.deserialize(item);
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setState(value);
      localStorage.setItem(key, serializer.serialize(value));
    } catch {
      // Silently fail localStorage write
    }
  }, [key, serializer]);

  // Update localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(key, serializer.serialize(state));
    } catch {
      // Silently fail localStorage update
    }
  }, [key, state, serializer]);

  return [state, setValue];
}

/**
 * Specialized hook for string values in localStorage
 */
export function useLocalStorageString(key: string, defaultValue: string = ''): [string, (value: string) => void] {
  return useLocalStorageState(key, defaultValue, {
    serialize: (value: string) => value,
    deserialize: (value: string) => value,
  });
}

/**
 * Specialized hook for boolean values in localStorage
 */
export function useLocalStorageBoolean(key: string, defaultValue: boolean = false): [boolean, (value: boolean) => void] {
  return useLocalStorageState(key, defaultValue, {
    serialize: (value: boolean) => value.toString(),
    deserialize: (value: string) => value === 'true',
  });
}
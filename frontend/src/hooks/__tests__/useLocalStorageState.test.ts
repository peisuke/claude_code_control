import { renderHook, act } from '@testing-library/react';
import { useLocalStorageString, useLocalStorageBoolean } from '../useLocalStorageState';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLocalStorageString', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should return default value when localStorage is empty', () => {
    const { result } = renderHook(() => 
      useLocalStorageString('test-key', 'default')
    );

    expect(result.current[0]).toBe('default');
  });

  it('should return stored value when localStorage has value', () => {
    localStorageMock.setItem('test-key', 'stored-value');
    
    const { result } = renderHook(() => 
      useLocalStorageString('test-key', 'default')
    );

    expect(result.current[0]).toBe('stored-value');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => 
      useLocalStorageString('test-key', 'default')
    );

    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', 'new-value');
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage.setItem to throw an error
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => 
      useLocalStorageString('test-key', 'default')
    );

    // Should not crash when localStorage throws
    act(() => {
      result.current[1]('new-value');
    });

    expect(result.current[0]).toBe('new-value');
  });
});

describe('useLocalStorageBoolean', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should return default value when localStorage is empty', () => {
    const { result } = renderHook(() => 
      useLocalStorageBoolean('test-bool', true)
    );

    expect(result.current[0]).toBe(true);
  });

  it('should return parsed boolean value from localStorage', () => {
    localStorageMock.setItem('test-bool', 'false');
    
    const { result } = renderHook(() => 
      useLocalStorageBoolean('test-bool', true)
    );

    expect(result.current[0]).toBe(false);
  });

  it('should store boolean as string in localStorage', () => {
    const { result } = renderHook(() => 
      useLocalStorageBoolean('test-bool', false)
    );

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-bool', 'true');
  });

  it('should handle invalid boolean strings gracefully', () => {
    localStorageMock.setItem('test-bool', 'invalid-boolean');
    
    const { result } = renderHook(() => 
      useLocalStorageBoolean('test-bool', true)
    );

    // Should fall back to default value for invalid boolean
    expect(result.current[0]).toBe(true);
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => 
      useLocalStorageBoolean('test-bool', false)
    );

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
  });
});
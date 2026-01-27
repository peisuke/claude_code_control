import { renderHook, act } from '@testing-library/react';
import { useLocalStorageString, useLocalStorageBoolean } from '../useLocalStorageState';

describe('useLocalStorageString', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockStorage[key] ?? null;
    });

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
    });

    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return default value when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorageString('test-key', 'default')
    );

    expect(result.current[0]).toBe('default');
  });

  it('should return stored value when localStorage has value', () => {
    mockStorage['test-key'] = 'stored-value';

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
    expect(mockStorage['test-key']).toBe('new-value');
  });

  it('should handle different keys independently', () => {
    mockStorage['key1'] = 'value1';
    mockStorage['key2'] = 'value2';

    const { result: result1 } = renderHook(() =>
      useLocalStorageString('key1', 'default1')
    );
    const { result: result2 } = renderHook(() =>
      useLocalStorageString('key2', 'default2')
    );

    expect(result1.current[0]).toBe('value1');
    expect(result2.current[0]).toBe('value2');
  });

  it('should persist value across re-renders', () => {
    const { result, rerender } = renderHook(() =>
      useLocalStorageString('test-key', 'default')
    );

    act(() => {
      result.current[1]('updated');
    });

    rerender();

    expect(result.current[0]).toBe('updated');
  });
});

describe('useLocalStorageBoolean', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockStorage[key] ?? null;
    });

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return default value when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorageBoolean('test-bool', true)
    );

    expect(result.current[0]).toBe(true);
  });

  it('should return false default value', () => {
    const { result } = renderHook(() =>
      useLocalStorageBoolean('test-bool', false)
    );

    expect(result.current[0]).toBe(false);
  });

  it('should return parsed boolean true from localStorage', () => {
    mockStorage['test-bool'] = 'true';

    const { result } = renderHook(() =>
      useLocalStorageBoolean('test-bool', false)
    );

    expect(result.current[0]).toBe(true);
  });

  it('should return parsed boolean false from localStorage', () => {
    mockStorage['test-bool'] = 'false';

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
    expect(mockStorage['test-bool']).toBe('true');
  });

  it('should toggle boolean value', () => {
    const { result } = renderHook(() =>
      useLocalStorageBoolean('test-bool', false)
    );

    act(() => {
      result.current[1](true);
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1](false);
    });
    expect(result.current[0]).toBe(false);
  });

  it('should handle invalid boolean strings as false', () => {
    mockStorage['test-bool'] = 'invalid-boolean';

    const { result } = renderHook(() =>
      useLocalStorageBoolean('test-bool', true)
    );

    // 'invalid-boolean' !== 'true', so deserialize returns false
    expect(result.current[0]).toBe(false);
  });
});

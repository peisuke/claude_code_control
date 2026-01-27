import { renderHook } from '@testing-library/react';
import { useAutoRefreshState } from '../useAutoRefreshState';

describe('useAutoRefreshState', () => {
  const mockWsConnect = jest.fn();
  const mockWsDisconnect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should connect WebSocket when isConnected, autoRefresh enabled, and not connected', () => {
    renderHook(() =>
      useAutoRefreshState({
        isConnected: true,
        autoRefresh: true,
        wsConnected: false,
        wsConnect: mockWsConnect,
        wsDisconnect: mockWsDisconnect,
      })
    );

    expect(mockWsConnect).toHaveBeenCalledTimes(1);
    expect(mockWsDisconnect).not.toHaveBeenCalled();
  });

  it('should not connect WebSocket when not isConnected', () => {
    renderHook(() =>
      useAutoRefreshState({
        isConnected: false,
        autoRefresh: true,
        wsConnected: false,
        wsConnect: mockWsConnect,
        wsDisconnect: mockWsDisconnect,
      })
    );

    expect(mockWsConnect).not.toHaveBeenCalled();
    expect(mockWsDisconnect).not.toHaveBeenCalled();
  });

  it('should not connect WebSocket when autoRefresh is disabled', () => {
    renderHook(() =>
      useAutoRefreshState({
        isConnected: true,
        autoRefresh: false,
        wsConnected: false,
        wsConnect: mockWsConnect,
        wsDisconnect: mockWsDisconnect,
      })
    );

    expect(mockWsConnect).not.toHaveBeenCalled();
    expect(mockWsDisconnect).not.toHaveBeenCalled();
  });

  it('should not connect WebSocket when already connected', () => {
    renderHook(() =>
      useAutoRefreshState({
        isConnected: true,
        autoRefresh: true,
        wsConnected: true,
        wsConnect: mockWsConnect,
        wsDisconnect: mockWsDisconnect,
      })
    );

    expect(mockWsConnect).not.toHaveBeenCalled();
    expect(mockWsDisconnect).not.toHaveBeenCalled();
  });

  it('should disconnect WebSocket when autoRefresh is disabled and connected', () => {
    renderHook(() =>
      useAutoRefreshState({
        isConnected: true,
        autoRefresh: false,
        wsConnected: true,
        wsConnect: mockWsConnect,
        wsDisconnect: mockWsDisconnect,
      })
    );

    expect(mockWsConnect).not.toHaveBeenCalled();
    expect(mockWsDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should not disconnect WebSocket when autoRefresh is enabled', () => {
    renderHook(() =>
      useAutoRefreshState({
        isConnected: true,
        autoRefresh: true,
        wsConnected: true,
        wsConnect: mockWsConnect,
        wsDisconnect: mockWsDisconnect,
      })
    );

    expect(mockWsConnect).not.toHaveBeenCalled();
    expect(mockWsDisconnect).not.toHaveBeenCalled();
  });

  it('should react to autoRefresh changes', () => {
    const { rerender } = renderHook(
      ({ autoRefresh }) =>
        useAutoRefreshState({
          isConnected: true,
          autoRefresh,
          wsConnected: false,
          wsConnect: mockWsConnect,
          wsDisconnect: mockWsDisconnect,
        }),
      { initialProps: { autoRefresh: false } }
    );

    expect(mockWsConnect).not.toHaveBeenCalled();

    rerender({ autoRefresh: true });

    expect(mockWsConnect).toHaveBeenCalledTimes(1);
  });

  it('should react to wsConnected changes for disconnect', () => {
    const { rerender } = renderHook(
      ({ wsConnected }) =>
        useAutoRefreshState({
          isConnected: true,
          autoRefresh: false,
          wsConnected,
          wsConnect: mockWsConnect,
          wsDisconnect: mockWsDisconnect,
        }),
      { initialProps: { wsConnected: false } }
    );

    expect(mockWsDisconnect).not.toHaveBeenCalled();

    rerender({ wsConnected: true });

    expect(mockWsDisconnect).toHaveBeenCalledTimes(1);
  });
});

import { WebSocketService } from '../websocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sentMessages: string[] = [];

  constructor(public url: string) {
    // Don't auto-connect - let tests control this
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code, reason });
    this.onclose?.(event);
  }

  simulateError() {
    this.onerror?.(new Event('error'));
  }

  simulateMessage(data: any) {
    const event = { data: JSON.stringify(data) } as MessageEvent;
    this.onmessage?.(event);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    this.sentMessages.push(data);
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    const event = new CloseEvent('close', { code: code || 1000, reason });
    this.onclose?.(event);
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWs: MockWebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new WebSocketService('test-session');
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.destroy();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with a target', () => {
      const service = new WebSocketService('my-session');
      expect(service.getConnectionState()).toBe('no-websocket');
      service.destroy();
    });

    it('should initialize with custom target', () => {
      expect(service.getConnectionState()).toBe('no-websocket');
    });

    it('should build correct WebSocket URL', () => {
      service.connect();
      mockWs = (service as any).ws;
      expect(mockWs.url).toContain('/api/tmux/ws/test-session');
      mockWs.simulateOpen();
    });
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      expect(service.getConnectionState()).toBe('connecting');

      mockWs.simulateOpen();
      await connectPromise;
      expect(service.isConnected()).toBe(true);
    });

    it('should disconnect properly', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;
      expect(service.isConnected()).toBe(true);

      service.disconnect();
      expect(service.isConnected()).toBe(false);
    });

    it('should clear reconnect timeout on disconnect', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).reconnectTimeoutId = 123;

      service.disconnect();
      expect((service as any).reconnectTimeoutId).toBeUndefined();
    });

    it('should reset reconnect attempts on disconnect', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).reconnectAttempts = 5;

      service.disconnect();
      expect(service.getReconnectAttempts()).toBe(0);
    });
  });

  describe('setTarget', () => {
    it('should not reconnect if target is same', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      const originalWs = (service as any).ws;
      service.setTarget('test-session');
      expect((service as any).ws).toBe(originalWs);
    });

    it('should reconnect when target changes', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      service.setTarget('new-session');

      const newWs = (service as any).ws;
      expect(newWs.url).toContain('/api/tmux/ws/new-session');
    });

    it('should clear pending reconnect timeout on target change', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).reconnectTimeoutId = 456;

      service.setTarget('new-session');
      expect((service as any).reconnectTimeoutId).toBeUndefined();
    });

    it('should reset reconnect attempts on target change', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).reconnectAttempts = 3;

      service.setTarget('new-session');
      expect(service.getReconnectAttempts()).toBe(0);
    });

    it('should not reconnect if was not connected', () => {
      service.setTarget('new-session');
      expect((service as any).ws).toBeNull();
    });
  });

  describe('calculateReconnectDelay', () => {
    it('should return 100ms for first attempt', () => {
      (service as any).reconnectAttempts = 0;
      const delay = (service as any).calculateReconnectDelay();
      expect(delay).toBe(100);
    });

    it('should return 1000ms for second attempt', () => {
      (service as any).reconnectAttempts = 1;
      const delay = (service as any).calculateReconnectDelay();
      expect(delay).toBe(1000);
    });

    it('should return 3000ms for third attempt', () => {
      (service as any).reconnectAttempts = 2;
      const delay = (service as any).calculateReconnectDelay();
      expect(delay).toBe(3000);
    });

    it('should return 5000ms for fourth attempt', () => {
      (service as any).reconnectAttempts = 3;
      const delay = (service as any).calculateReconnectDelay();
      expect(delay).toBe(5000);
    });

    it('should use exponential backoff with jitter for subsequent attempts', () => {
      (service as any).reconnectAttempts = 4;
      const delay = (service as any).calculateReconnectDelay();
      expect(delay).toBeGreaterThanOrEqual(1600);
      expect(delay).toBeLessThanOrEqual(1600 * 1.3);
    });

    it('should cap delay at maxReconnectInterval', () => {
      (service as any).reconnectAttempts = 10;
      const delay = (service as any).calculateReconnectDelay();
      expect(delay).toBeLessThanOrEqual(10000 * 1.3);
    });
  });

  describe('heartbeat', () => {
    it('should start heartbeat on connect', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      expect((service as any).heartbeatIntervalId).toBeDefined();
    });

    it('should send ping every 10 seconds', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      jest.advanceTimersByTime(10000);

      expect(mockWs.sentMessages.length).toBeGreaterThan(0);
      const pingMessage = JSON.parse(mockWs.sentMessages[0]);
      expect(pingMessage.type).toBe('ping');
    });

    it('should stop heartbeat on disconnect', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      const intervalId = (service as any).heartbeatIntervalId;
      expect(intervalId).toBeDefined();

      service.disconnect();
      expect((service as any).heartbeatIntervalId).toBeUndefined();
    });

    it('should not throw if ping fails', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.send = () => { throw new Error('Send failed'); };

      expect(() => jest.advanceTimersByTime(10000)).not.toThrow();
    });
  });

  describe('connection check', () => {
    it('should start connection check on connect', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      expect((service as any).connectionCheckIntervalId).toBeDefined();
    });

    it('should trigger resetAndReconnect if heartbeat timeout', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).lastHeartbeatTime = Date.now() - 30000;

      const resetSpy = jest.spyOn(service, 'resetAndReconnect');

      jest.advanceTimersByTime(5000);

      expect(resetSpy).toHaveBeenCalled();
    });

    it('should stop connection check on disconnect', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      expect((service as any).connectionCheckIntervalId).toBeDefined();

      service.disconnect();
      expect((service as any).connectionCheckIntervalId).toBeUndefined();
    });
  });

  describe('callbacks', () => {
    it('should register and call onConnection callback', async () => {
      const mockCallback = jest.fn();
      service.onConnection(mockCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it('should call onConnection with false on disconnect', async () => {
      const mockCallback = jest.fn();
      service.onConnection(mockCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockCallback.mockClear();
      service.disconnect();

      expect(mockCallback).toHaveBeenCalledWith(false);
    });

    it('should register and call onMessage callback', async () => {
      const mockCallback = jest.fn();
      service.onMessage(mockCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateMessage({
        target: 'test-session',
        content: 'test output',
        timestamp: new Date().toISOString()
      });

      expect(mockCallback).toHaveBeenCalledWith({
        target: 'test-session',
        content: 'test output',
        timestamp: expect.any(String)
      });
    });

    it('should not call onMessage for different target', async () => {
      const mockCallback = jest.fn();
      service.onMessage(mockCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateMessage({
        target: 'other-session',
        content: 'should not receive',
        timestamp: new Date().toISOString()
      });

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should register and call onReconnecting callback', async () => {
      const mockCallback = jest.fn();
      service.onReconnecting(mockCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateClose(1006, 'Abnormal closure');

      expect(mockCallback).toHaveBeenCalledWith(1, 999);
    });
  });

  describe('message handling', () => {
    it('should handle heartbeat messages', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      const initialHeartbeatTime = (service as any).lastHeartbeatTime;

      jest.advanceTimersByTime(100);

      mockWs.simulateMessage({ type: 'heartbeat', timestamp: Date.now() });

      expect((service as any).lastHeartbeatTime).toBeGreaterThanOrEqual(initialHeartbeatTime);
    });

    it('should send ping in response to heartbeat', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.sentMessages = [];

      mockWs.simulateMessage({ type: 'heartbeat', timestamp: Date.now() });

      expect(mockWs.sentMessages.length).toBe(1);
      const response = JSON.parse(mockWs.sentMessages[0]);
      expect(response.type).toBe('ping');
    });

    it('should handle pong messages', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      const initialHeartbeatTime = (service as any).lastHeartbeatTime;
      jest.advanceTimersByTime(100);

      mockWs.simulateMessage({ type: 'pong', timestamp: Date.now() });

      expect((service as any).lastHeartbeatTime).toBeGreaterThanOrEqual(initialHeartbeatTime);
    });

    it('should handle malformed messages gracefully', async () => {
      const mockCallback = jest.fn();
      service.onMessage(mockCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      const event = { data: 'invalid json' } as MessageEvent;
      expect(() => mockWs.onmessage?.(event)).not.toThrow();
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('reconnection', () => {
    it('should schedule reconnect on abnormal close', async () => {
      const reconnectCallback = jest.fn();
      service.onReconnecting(reconnectCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateClose(1006, 'Abnormal closure');

      expect(reconnectCallback).toHaveBeenCalled();
      expect((service as any).reconnectTimeoutId).toBeDefined();
    });

    it('should not reconnect on normal close (code 1000)', async () => {
      const reconnectCallback = jest.fn();
      service.onReconnecting(reconnectCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateClose(1000, 'Normal closure');

      expect(reconnectCallback).not.toHaveBeenCalled();
    });

    it('should not reconnect after manual disconnect', async () => {
      const reconnectCallback = jest.fn();
      service.onReconnecting(reconnectCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      service.disconnect();
      reconnectCallback.mockClear();

      jest.advanceTimersByTime(10000);

      expect(reconnectCallback).not.toHaveBeenCalled();
    });

    it('should attempt reconnection with increasing delays', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateClose(1006, 'Abnormal closure');

      expect(service.getReconnectAttempts()).toBe(1);

      jest.advanceTimersByTime(100);

      const newWs = (service as any).ws;
      expect(newWs).toBeDefined();
    });

    it('should continue reconnecting on failed attempts', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.simulateClose(1006, 'Abnormal closure');
      expect(service.getReconnectAttempts()).toBe(1);

      jest.advanceTimersByTime(100);
      const newWs = (service as any).ws;
      newWs.simulateClose(1006, 'Still failing');

      expect(service.getReconnectAttempts()).toBe(2);
    });
  });

  describe('resetAndReconnect', () => {
    it('should reset state and reconnect', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).reconnectAttempts = 5;

      service.resetAndReconnect();

      expect(service.getReconnectAttempts()).toBe(0);
      expect((service as any).shouldReconnect).toBe(true);
      expect((service as any).isManualDisconnect).toBe(false);
    });

    it('should clear pending reconnect timeout', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).reconnectTimeoutId = 789;

      service.resetAndReconnect();

      expect((service as any).reconnectTimeoutId).toBeUndefined();
    });

    it('should close existing connection', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      service.resetAndReconnect();

      expect(mockWs.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should attempt reconnection after 100ms', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      service.resetAndReconnect();

      jest.advanceTimersByTime(100);

      expect((service as any).ws).toBeDefined();
    });
  });

  describe('state methods', () => {
    it('should return correct connection state', async () => {
      expect(service.getConnectionState()).toBe('no-websocket');

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      expect(service.getConnectionState()).toBe('connecting');

      mockWs.simulateOpen();
      await connectPromise;
      expect(service.getConnectionState()).toBe('open');

      service.disconnect();
      expect(service.getConnectionState()).toBe('no-websocket');
    });

    it('should return closing state', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.readyState = MockWebSocket.CLOSING;
      expect(service.getConnectionState()).toBe('closing');
    });

    it('should return closed state', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.readyState = MockWebSocket.CLOSED;
      expect(service.getConnectionState()).toBe('closed');
    });

    it('should return unknown for invalid state', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      mockWs.readyState = 999;
      expect(service.getConnectionState()).toBe('unknown');
    });

    it('should track reconnection attempts', () => {
      expect(service.getReconnectAttempts()).toBe(0);
      expect(service.getMaxReconnectAttempts()).toBe(-1);
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', async () => {
      const mockConnectionCallback = jest.fn();
      const mockMessageCallback = jest.fn();
      const mockReconnectingCallback = jest.fn();

      service.onConnection(mockConnectionCallback);
      service.onMessage(mockMessageCallback);
      service.onReconnecting(mockReconnectingCallback);

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      service.destroy();

      expect(service.getConnectionState()).toBe('no-websocket');
      expect(service.isConnected()).toBe(false);
      expect(service.getReconnectAttempts()).toBe(0);
      expect((service as any).lastHeartbeatTime).toBe(0);
    });

    it('should clear all callbacks', async () => {
      service.onConnection(jest.fn());
      service.onMessage(jest.fn());
      service.onReconnecting(jest.fn());

      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      service.destroy();

      expect((service as any).onConnectionCallback).toBeUndefined();
      expect((service as any).onMessageCallback).toBeUndefined();
      expect((service as any).onReconnectingCallback).toBeUndefined();
    });

    it('should clear all WebSocket event handlers', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      service.destroy();

      expect(mockWs.onopen).toBeNull();
      expect(mockWs.onmessage).toBeNull();
      expect(mockWs.onclose).toBeNull();
      expect(mockWs.onerror).toBeNull();
    });

    it('should stop heartbeat and connection check', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      expect((service as any).heartbeatIntervalId).toBeDefined();
      expect((service as any).connectionCheckIntervalId).toBeDefined();

      service.destroy();

      expect((service as any).heartbeatIntervalId).toBeUndefined();
      expect((service as any).connectionCheckIntervalId).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should reject connect promise on initial error', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;

      mockWs.simulateError();

      await expect(connectPromise).rejects.toBeDefined();
    });

    it('should not reject on error after initial connection', async () => {
      const connectPromise = service.connect();
      mockWs = (service as any).ws;
      mockWs.simulateOpen();
      await connectPromise;

      (service as any).reconnectAttempts = 1;

      expect(() => mockWs.simulateError()).not.toThrow();
    });

    it('should handle connect throwing error', async () => {
      const originalWS = (global as any).WebSocket;
      (global as any).WebSocket = function() {
        throw new Error('WebSocket not supported');
      };

      const newService = new WebSocketService('test');
      await expect(newService.connect()).rejects.toThrow('WebSocket not supported');

      (global as any).WebSocket = originalWS;
    });
  });

  describe('clear reconnect timeout on connect', () => {
    it('should clear existing reconnect timeout when connecting', async () => {
      (service as any).reconnectTimeoutId = 999;

      const connectPromise = service.connect();
      mockWs = (service as any).ws;

      expect((service as any).reconnectTimeoutId).toBeUndefined();

      mockWs.simulateOpen();
      await connectPromise;
    });
  });
});

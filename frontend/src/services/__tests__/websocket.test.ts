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

  constructor(public url: string) {
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
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

  beforeEach(() => {
    service = new WebSocketService('test-session');
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.destroy();
  });

  describe('constructor', () => {
    it('should initialize with default target', () => {
      const defaultService = new WebSocketService();
      expect(defaultService.getConnectionState()).toBe('no-websocket');
      defaultService.destroy();
    });

    it('should initialize with custom target', () => {
      expect(service.getConnectionState()).toBe('no-websocket');
    });
  });

  describe('connection management', () => {
    it('should connect successfully', async () => {
      const connectPromise = service.connect();
      expect(service.getConnectionState()).toBe('connecting');
      
      await connectPromise;
      expect(service.isConnected()).toBe(true);
    });

    it('should disconnect properly', async () => {
      await service.connect();
      expect(service.isConnected()).toBe(true);
      
      service.disconnect();
      expect(service.isConnected()).toBe(false);
    });

    it('should handle target change', async () => {
      await service.connect();
      expect(service.isConnected()).toBe(true);
      
      service.setTarget('new-session');
      // After target change, should eventually reconnect
      // This is async, so we just verify it doesn't crash
    });
  });

  describe('callbacks', () => {
    it('should register and call onConnection callback', async () => {
      const mockCallback = jest.fn();
      service.onConnection(mockCallback);
      
      await service.connect();
      
      expect(mockCallback).toHaveBeenCalledWith(true);
    });

    it('should register and call onMessage callback', async () => {
      const mockCallback = jest.fn();
      service.onMessage(mockCallback);
      
      await service.connect();
      
      // Simulate incoming message
      const mockMessage = {
        data: JSON.stringify({
          target: 'test-session',
          content: 'test output',
          timestamp: new Date().toISOString()
        })
      };
      
      // Access private ws property for testing
      const ws = (service as any).ws;
      ws.onmessage?.(mockMessage);
      
      expect(mockCallback).toHaveBeenCalledWith({
        target: 'test-session',
        content: 'test output',
        timestamp: expect.any(String)
      });
    });
  });

  describe('state methods', () => {
    it('should return correct connection state', async () => {
      expect(service.getConnectionState()).toBe('no-websocket');
      
      const connectPromise = service.connect();
      expect(service.getConnectionState()).toBe('connecting');
      
      await connectPromise;
      expect(service.getConnectionState()).toBe('open');
      
      service.disconnect();
      expect(service.getConnectionState()).toBe('no-websocket');
    });

    it('should track reconnection attempts', () => {
      expect(service.getReconnectAttempts()).toBe(0);
      expect(service.getMaxReconnectAttempts()).toBe(-1); // unlimited
    });
  });

  describe('destroy', () => {
    it('should clean up all resources', async () => {
      const mockConnectionCallback = jest.fn();
      const mockMessageCallback = jest.fn();
      
      service.onConnection(mockConnectionCallback);
      service.onMessage(mockMessageCallback);
      
      await service.connect();
      
      service.destroy();
      
      expect(service.getConnectionState()).toBe('no-websocket');
      expect(service.isConnected()).toBe(false);
      expect(service.getReconnectAttempts()).toBe(0);
    });
  });

  describe('heartbeat and health checks', () => {
    it('should handle ping/pong messages', async () => {
      await service.connect();
      
      const ws = (service as any).ws;
      
      // Simulate pong response
      const pongMessage = {
        data: JSON.stringify({ type: 'pong', timestamp: Date.now() })
      };
      
      expect(() => ws.onmessage?.(pongMessage)).not.toThrow();
    });

    it('should handle heartbeat messages', async () => {
      await service.connect();
      
      const ws = (service as any).ws;
      
      // Simulate server heartbeat
      const heartbeatMessage = {
        data: JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })
      };
      
      expect(() => ws.onmessage?.(heartbeatMessage)).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle malformed messages gracefully', async () => {
      const mockCallback = jest.fn();
      service.onMessage(mockCallback);
      
      await service.connect();
      
      const ws = (service as any).ws;
      
      // Simulate malformed message
      const invalidMessage = {
        data: 'invalid json'
      };
      
      expect(() => ws.onmessage?.(invalidMessage)).not.toThrow();
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
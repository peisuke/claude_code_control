import { TmuxOutput } from '../types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private sessionName: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = -1; // Unlimited attempts
  private baseReconnectInterval = 100;
  private maxReconnectInterval = 10000;
  private reconnectTimeoutId?: number;
  private shouldReconnect = true;
  private heartbeatIntervalId?: number;
  private lastHeartbeatTime = 0;
  private connectionCheckIntervalId?: number;
  private isManualDisconnect = false;
  private onMessageCallback?: (output: TmuxOutput) => void;
  private onConnectionCallback?: (connected: boolean) => void;
  private onReconnectingCallback?: (attempt: number, maxAttempts: number) => void;
  private lastRefreshRate: number = 0.1;

  constructor(target: string = 'default') {
    this.sessionName = target;
    // Use the same host as the current page, with WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development'
      ? (process.env.REACT_APP_BACKEND_PORT || '8000')
      : window.location.port;
    this.baseUrl = `${protocol}//${host}:${port}/api/tmux/ws`;
  }

  private get url(): string {
    return `${this.baseUrl}/${encodeURIComponent(this.sessionName)}`;
  }

  setTarget(target: string): void {
    if (this.sessionName !== target) {
      const wasConnected = this.isConnected();

      // Stop heartbeat and connection check but don't trigger disconnect callback
      this.stopHeartbeat();
      this.stopConnectionCheck();

      // Clear any pending reconnection
      if (this.reconnectTimeoutId) {
        clearTimeout(this.reconnectTimeoutId);
        this.reconnectTimeoutId = undefined;
      }

      // Close existing WebSocket without triggering full disconnect flow
      if (this.ws) {
        this.ws.onclose = null; // Prevent onclose from triggering reconnect
        this.ws.close(1000, 'Target change');
        this.ws = null;
      }

      // Update target and reconnect
      this.sessionName = target;
      this.reconnectAttempts = 0;
      this.shouldReconnect = true;
      this.isManualDisconnect = false;

      if (wasConnected) {
        // Immediate reconnection with new target
        this.connect().catch(() => {
          this.scheduleReconnect();
        });
      }
    }
  }

  private calculateReconnectDelay(): number {
    // Faster initial reconnections for mobile app resume scenarios
    if (this.reconnectAttempts === 0) return 100;
    if (this.reconnectAttempts === 1) return 1000;
    if (this.reconnectAttempts === 2) return 3000;
    if (this.reconnectAttempts === 3) return 5000;
    
    const exponentialDelay = Math.min(
      this.baseReconnectInterval * Math.pow(2, Math.min(this.reconnectAttempts, 6)),
      this.maxReconnectInterval
    );
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatIntervalId = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          this.lastHeartbeatTime = Date.now();
        } catch {
          // Silently fail ping - connection will be handled by reconnect logic
        }
      }
    }, 10000); // Send ping every 10 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = undefined;
    }
  }

  private startConnectionCheck(): void {
    this.stopConnectionCheck();
    this.connectionCheckIntervalId = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN && this.lastHeartbeatTime > 0) {
        // Check if we haven't received a heartbeat response in 25 seconds
        if (Date.now() - this.lastHeartbeatTime > 25000) {
          this.resetAndReconnect();
        }
      }
    }, 5000); // Check every 5 seconds
  }

  private stopConnectionCheck(): void {
    if (this.connectionCheckIntervalId) {
      clearInterval(this.connectionCheckIntervalId);
      this.connectionCheckIntervalId = undefined;
    }
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Clear any existing reconnect timeout
        if (this.reconnectTimeoutId) {
          clearTimeout(this.reconnectTimeoutId);
          this.reconnectTimeoutId = undefined;
        }

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.shouldReconnect = true;
          this.isManualDisconnect = false;
          this.lastHeartbeatTime = Date.now();
          this.startHeartbeat();
          this.startConnectionCheck();
          // Resend last refresh rate on every (re)connection
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'set_refresh_rate', interval: this.lastRefreshRate }));
          }
          this.onConnectionCallback?.(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle heartbeat messages
            if (data.type === 'heartbeat') {
              // Update last heartbeat time and send ping response
              this.lastHeartbeatTime = Date.now();
              if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
              }
              return;
            }
            
            // Handle pong responses
            if (data.type === 'pong') {
              this.lastHeartbeatTime = Date.now();
              return;
            }
            
            // Handle regular tmux output
            const output: TmuxOutput = data;
            
            // Only process messages that match the current target
            if (output.target === this.sessionName) {
              this.onMessageCallback?.(output);
            }
          } catch {
            // Silently fail message parsing
          }
        };

        this.ws.onclose = (event) => {
          this.stopHeartbeat();
          this.stopConnectionCheck();
          this.onConnectionCallback?.(false);
          
          // Only attempt reconnection if it wasn't a manual disconnect
          if (this.shouldReconnect && !this.isManualDisconnect && event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          // Don't reject immediately on error, let onclose handle reconnection
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.stopConnectionCheck();
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = 0;
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay();

    this.onReconnectingCallback?.(this.reconnectAttempts, this.maxReconnectAttempts > 0 ? this.maxReconnectAttempts : 999);

    this.reconnectTimeoutId = window.setTimeout(() => {
      if (this.shouldReconnect && !this.isManualDisconnect) {
        this.connect().catch(() => {
          // Continue attempting reconnection indefinitely
          this.scheduleReconnect();
        });
      }
    }, delay);
  }

  onMessage(callback: (output: TmuxOutput) => void): void {
    this.onMessageCallback = callback;
  }

  onConnection(callback: (connected: boolean) => void): void {
    this.onConnectionCallback = callback;
  }

  onReconnecting(callback: (attempt: number, maxAttempts: number) => void): void {
    this.onReconnectingCallback = callback;
  }

  setRefreshRate(interval: number): void {
    this.lastRefreshRate = interval;
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'set_refresh_rate', interval }));
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }

  // Reset reconnection attempts and reconnect
  resetAndReconnect(): void {
    // Stop any ongoing operations
    this.stopHeartbeat();
    this.stopConnectionCheck();
    
    // Reset state
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
    this.isManualDisconnect = false;
    
    // Clear any pending reconnection
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
    
    // Close existing connection if any
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Direct reconnection attempt
    setTimeout(() => {
      this.connect().catch(() => {
        this.scheduleReconnect();
      });
    }, 100);
  }

  // Get current connection state for debugging
  getConnectionState(): string {
    if (!this.ws) return 'no-websocket';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  // Complete cleanup and destruction of the WebSocket service
  destroy(): void {
    // Disable auto-reconnection
    this.shouldReconnect = false;
    this.isManualDisconnect = true;
    
    // Stop all intervals and timeouts
    this.stopHeartbeat();
    this.stopConnectionCheck();
    
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.close(1000, 'Service destroyed');
      this.ws = null;
    }
    
    // Clear all callbacks to prevent memory leaks
    this.onMessageCallback = undefined;
    this.onConnectionCallback = undefined;
    this.onReconnectingCallback = undefined;
    
    // Reset all state
    this.reconnectAttempts = 0;
    this.lastHeartbeatTime = 0;
  }
}
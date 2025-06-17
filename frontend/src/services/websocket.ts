import { TmuxOutput } from '../types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private sessionName: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectInterval = 1000;
  private maxReconnectInterval = 30000;
  private reconnectTimeoutId?: number;
  private shouldReconnect = true;
  private onMessageCallback?: (output: TmuxOutput) => void;
  private onConnectionCallback?: (connected: boolean) => void;
  private onReconnectingCallback?: (attempt: number, maxAttempts: number) => void;

  constructor(target: string = 'default') {
    this.sessionName = target;
    // Use the same host as the current page, with WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = process.env.NODE_ENV === 'development' ? '8000' : window.location.port;
    this.baseUrl = `${protocol}//${host}:${port}/api/tmux/ws`;
  }

  private get url(): string {
    return `${this.baseUrl}/${encodeURIComponent(this.sessionName)}`;
  }

  setTarget(target: string): void {
    if (this.sessionName !== target) {
      const wasConnected = this.isConnected();
      
      // Ensure clean disconnection
      this.disconnect();
      
      // Wait for connection to fully close before reconnecting
      setTimeout(() => {
        this.sessionName = target;
        
        if (wasConnected) {
          this.connect().catch(console.error);
        }
      }, 100);
    }
  }

  private calculateReconnectDelay(): number {
    const exponentialDelay = Math.min(
      this.baseReconnectInterval * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectInterval
    );
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.onConnectionCallback?.(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle heartbeat messages
            if (data.type === 'heartbeat') {
              // Send ping response
              if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
              }
              return;
            }
            
            // Handle pong responses (if we implement client-side heartbeat)
            if (data.type === 'pong') {
              return;
            }
            
            // Handle regular tmux output
            const output: TmuxOutput = data;
            
            // Only process messages that match the current target
            if (output.target === this.sessionName) {
              this.onMessageCallback?.(output);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          this.onConnectionCallback?.(false);
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
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
    
    console.log(`Attempting to reconnect in ${Math.round(delay)}ms... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    this.onReconnectingCallback?.(this.reconnectAttempts, this.maxReconnectAttempts);
    
    this.reconnectTimeoutId = window.setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
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

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  isReconnecting(): boolean {
    return this.reconnectAttempts > 0 && this.reconnectAttempts < this.maxReconnectAttempts;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }
  
  enableAutoReconnect(): void {
    this.shouldReconnect = true;
  }
  
  disableAutoReconnect(): void {
    this.shouldReconnect = false;
  }

  // Force reconnection (useful for mobile app resume)
  forceReconnect(): void {
    console.log('Force reconnect called, current state:', this.ws?.readyState);
    
    // Always disconnect first to ensure clean state
    this.disconnect();
    
    // Reset reconnection state
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    
    // Wait a bit then reconnect
    setTimeout(() => {
      console.log('Starting forced reconnection...');
      this.connect().catch(error => {
        console.error('Forced reconnection failed:', error);
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
}
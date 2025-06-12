import { TmuxOutput } from '../types';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private sessionName: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private onMessageCallback?: (output: TmuxOutput) => void;
  private onConnectionCallback?: (connected: boolean) => void;

  constructor(target: string = 'default', baseUrl: string = 'ws://localhost:8000/api/tmux/ws') {
    this.sessionName = target;
    this.baseUrl = baseUrl;
  }

  private get url(): string {
    return `${this.baseUrl}/${encodeURIComponent(this.sessionName)}`;
  }

  setTarget(target: string): void {
    if (this.sessionName !== target) {
      const wasConnected = this.isConnected();
      this.disconnect();
      this.sessionName = target;
      
      if (wasConnected) {
        this.connect().catch(console.error);
      }
    }
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
            const output: TmuxOutput = JSON.parse(event.data);
            this.onMessageCallback?.(output);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected', event.code, event.reason);
          this.onConnectionCallback?.(false);
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
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
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectInterval);
  }

  onMessage(callback: (output: TmuxOutput) => void): void {
    this.onMessageCallback = callback;
  }

  onConnection(callback: (connected: boolean) => void): void {
    this.onConnectionCallback = callback;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
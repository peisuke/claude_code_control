import { CommandRequest, TmuxSettings, TmuxOutput, ApiResponse } from '../types';

class TmuxAPI {
  private baseURL = '/api';

  async sendCommand(command: string, target?: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/send-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command,
        target: target || 'default',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async sendEnter(target: string = 'default'): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/send-enter?target=${encodeURIComponent(target)}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getOutput(target: string = 'default'): Promise<TmuxOutput> {
    const response = await fetch(`${this.baseURL}/tmux/output?target=${encodeURIComponent(target)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getSessions(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/tmux/sessions`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse = await response.json();
    return result.data?.sessions || [];
  }

  async getHierarchy(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/hierarchy`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getStatus(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/status`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getSettings(): Promise<TmuxSettings> {
    const response = await fetch(`${this.baseURL}/settings/`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async saveSettings(settings: TmuxSettings): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/settings/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async testConnection(): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/settings/test-connection`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const tmuxAPI = new TmuxAPI();
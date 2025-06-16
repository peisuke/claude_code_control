import { TmuxSettings, TmuxOutput, ApiResponse } from '../types';

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

  async getOutput(target: string = 'default', includeHistory: boolean = false, lines?: number): Promise<TmuxOutput> {
    const params = new URLSearchParams({ target });
    if (includeHistory) {
      params.append('include_history', 'true');
      if (lines) {
        params.append('lines', lines.toString());
      }
    }
    
    const response = await fetch(`${this.baseURL}/tmux/output?${params}`);

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

  async createSession(sessionName: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/create-session?session_name=${encodeURIComponent(sessionName)}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteSession(sessionName: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/session/${encodeURIComponent(sessionName)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createWindow(sessionName: string, windowName?: string): Promise<ApiResponse> {
    const url = new URL(`${this.baseURL}/tmux/create-window`);
    url.searchParams.append('session_name', sessionName);
    if (windowName) {
      url.searchParams.append('window_name', windowName);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async deleteWindow(sessionName: string, windowIndex: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/window/${encodeURIComponent(sessionName)}/${encodeURIComponent(windowIndex)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const tmuxAPI = new TmuxAPI();
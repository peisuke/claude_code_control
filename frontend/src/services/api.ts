import { TmuxOutput, ApiResponse, FileTreeResponse, FileContentResponse, TmuxSession } from '../types';

class TmuxAPI {
  private baseURL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : '/api';

  async sendCommand(command: string, target: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/send-command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command,
        target,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async sendEnter(target: string): Promise<ApiResponse> {
    const response = await fetch(`${this.baseURL}/tmux/send-enter?target=${encodeURIComponent(target)}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getOutput(target: string, includeHistory: boolean = false, lines?: number): Promise<TmuxOutput> {
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

  async getHierarchy(): Promise<ApiResponse<Record<string, TmuxSession>>> {
    const response = await fetch(`${this.baseURL}/tmux/hierarchy`);

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
    const params = new URLSearchParams();
    params.append('session_name', sessionName);
    if (windowName) {
      params.append('window_name', windowName);
    }

    const response = await fetch(`${this.baseURL}/tmux/create-window?${params}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async resizePane(target: string, cols: number, rows: number): Promise<ApiResponse> {
    const params = new URLSearchParams({
      target,
      cols: cols.toString(),
      rows: rows.toString(),
    });
    const response = await fetch(`${this.baseURL}/tmux/resize?${params}`, {
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

  // File operations
  async getFileTree(path: string = '/'): Promise<ApiResponse<FileTreeResponse>> {
    const response = await fetch(`${this.baseURL}/files/tree?path=${encodeURIComponent(path)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getFileContent(path: string): Promise<ApiResponse<FileContentResponse>> {
    const response = await fetch(`${this.baseURL}/files/content?path=${encodeURIComponent(path)}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const tmuxAPI = new TmuxAPI();
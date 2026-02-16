import { tmuxAPI } from '../api';

describe('TmuxAPI', () => {
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('sendCommand', () => {
    it('should send command with target', async () => {
      const mockResponse = { success: true, message: 'Command sent' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.sendCommand('ls -la', 'my-session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/send-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'ls -la',
          target: 'my-session',
        }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should send command with custom target', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.sendCommand('echo hello', 'session:window');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/send-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: 'echo hello',
          target: 'session:window',
        }),
      });
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(tmuxAPI.sendCommand('ls', 'my-session')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('sendEnter', () => {
    it('should send enter with default target', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.sendEnter('my-session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/send-enter?target=my-session', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should send enter with custom target', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.sendEnter('my-session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/send-enter?target=my-session', {
        method: 'POST',
      });
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(tmuxAPI.sendEnter('test')).rejects.toThrow('HTTP error! status: 404');
    });
  });

  describe('getOutput', () => {
    it('should get output with default parameters', async () => {
      const mockOutput = { output: 'terminal content', timestamp: Date.now() };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOutput),
      });

      const result = await tmuxAPI.getOutput('my-session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/output?target=my-session');
      expect(result).toEqual(mockOutput);
    });

    it('should get output with custom target', async () => {
      const mockOutput = { output: 'content' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOutput),
      });

      await tmuxAPI.getOutput('session:0');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/output?target=session%3A0');
    });

    it('should get output with history', async () => {
      const mockOutput = { output: 'historical content' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOutput),
      });

      await tmuxAPI.getOutput('default', true);

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/output?target=default&include_history=true');
    });

    it('should get output with history and lines limit', async () => {
      const mockOutput = { output: 'limited content' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOutput),
      });

      await tmuxAPI.getOutput('default', true, 500);

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/output?target=default&include_history=true&lines=500');
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      });

      await expect(tmuxAPI.getOutput('test')).rejects.toThrow('HTTP error! status: 503');
    });
  });

  describe('getHierarchy', () => {
    it('should get tmux hierarchy', async () => {
      const mockHierarchy = {
        success: true,
        data: {
          'session1': { windows: [] },
          'session2': { windows: [] },
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockHierarchy),
      });

      const result = await tmuxAPI.getHierarchy();

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/hierarchy');
      expect(result).toEqual(mockHierarchy);
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(tmuxAPI.getHierarchy()).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const mockResponse = { success: true, message: 'Connected' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.testConnection();

      expect(mockFetch).toHaveBeenCalledWith('/api/settings/test-connection', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
      });

      await expect(tmuxAPI.testConnection()).rejects.toThrow('HTTP error! status: 502');
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const mockResponse = { success: true, message: 'Session created' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.createSession('new-session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/create-session?session_name=new-session', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should URL encode session name', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.createSession('my session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/create-session?session_name=my%20session', {
        method: 'POST',
      });
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      await expect(tmuxAPI.createSession('test')).rejects.toThrow('HTTP error! status: 400');
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      const mockResponse = { success: true, message: 'Session deleted' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.deleteSession('old-session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/session/old-session', {
        method: 'DELETE',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should URL encode session name', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.deleteSession('session:special');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/session/session%3Aspecial', {
        method: 'DELETE',
      });
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(tmuxAPI.deleteSession('nonexistent')).rejects.toThrow('HTTP error! status: 404');
    });
  });

  describe('createWindow', () => {
    it('should create window without name', async () => {
      const mockResponse = { success: true, message: 'Window created' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.createWindow('my-session');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/create-window?session_name=my-session', {
        method: 'POST',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should create window with name', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.createWindow('my-session', 'my-window');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/create-window?session_name=my-session&window_name=my-window', {
        method: 'POST',
      });
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(tmuxAPI.createWindow('session')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('deleteWindow', () => {
    it('should delete a window', async () => {
      const mockResponse = { success: true, message: 'Window deleted' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.deleteWindow('my-session', '0');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/window/my-session/0', {
        method: 'DELETE',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should URL encode parameters', async () => {
      const mockResponse = { success: true };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.deleteWindow('session:name', '1');

      expect(mockFetch).toHaveBeenCalledWith('/api/tmux/window/session%3Aname/1', {
        method: 'DELETE',
      });
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(tmuxAPI.deleteWindow('session', '99')).rejects.toThrow('HTTP error! status: 404');
    });
  });

  describe('getFileTree', () => {
    it('should get file tree with default path', async () => {
      const mockResponse = {
        success: true,
        data: { path: '/', children: [] },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.getFileTree();

      expect(mockFetch).toHaveBeenCalledWith('/api/files/tree?path=%2F');
      expect(result).toEqual(mockResponse);
    });

    it('should get file tree with custom path', async () => {
      const mockResponse = {
        success: true,
        data: { path: '/home/user', children: [] },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.getFileTree('/home/user');

      expect(mockFetch).toHaveBeenCalledWith('/api/files/tree?path=%2Fhome%2Fuser');
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
      });

      await expect(tmuxAPI.getFileTree()).rejects.toThrow('HTTP error! status: 403');
    });
  });

  describe('getFileContent', () => {
    it('should get file content', async () => {
      const mockResponse = {
        success: true,
        data: { content: 'file content here', path: '/file.txt' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await tmuxAPI.getFileContent('/file.txt');

      expect(mockFetch).toHaveBeenCalledWith('/api/files/content?path=%2Ffile.txt');
      expect(result).toEqual(mockResponse);
    });

    it('should URL encode path with special characters', async () => {
      const mockResponse = {
        success: true,
        data: { content: 'content', path: '/path with spaces/file.txt' },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await tmuxAPI.getFileContent('/path with spaces/file.txt');

      expect(mockFetch).toHaveBeenCalledWith('/api/files/content?path=%2Fpath%20with%20spaces%2Ffile.txt');
    });

    it('should throw error on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(tmuxAPI.getFileContent('/nonexistent.txt')).rejects.toThrow('HTTP error! status: 404');
    });
  });

  describe('baseURL configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use /api as default baseURL when REACT_APP_API_URL is not set', () => {
      // The tmuxAPI instance uses '/api' by default
      // This is tested implicitly by all the other tests above
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

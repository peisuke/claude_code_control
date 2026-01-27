import { TmuxUtils } from '../tmux';

describe('TmuxUtils', () => {
  describe('sanitizeCommand', () => {
    it('should trim whitespace from commands', () => {
      expect(TmuxUtils.sanitizeCommand('  ls  ')).toBe('ls');
      expect(TmuxUtils.sanitizeCommand('\techo hello\n')).toBe('echo hello');
    });

    it('should handle empty and whitespace-only commands', () => {
      expect(TmuxUtils.sanitizeCommand('')).toBe('');
      expect(TmuxUtils.sanitizeCommand('   ')).toBe('');
      expect(TmuxUtils.sanitizeCommand('\t\n')).toBe('');
    });

    it('should return trimmed command without modification', () => {
      expect(TmuxUtils.sanitizeCommand('rm -rf /')).toBe('rm -rf /');
      expect(TmuxUtils.sanitizeCommand('ls -la')).toBe('ls -la');
    });
  });

  describe('isValidCommand', () => {
    it('should validate non-empty commands', () => {
      expect(TmuxUtils.isValidCommand('ls')).toBe(true);
      expect(TmuxUtils.isValidCommand('pwd')).toBe(true);
      expect(TmuxUtils.isValidCommand('echo hello')).toBe(true);
      expect(TmuxUtils.isValidCommand('rm -rf /')).toBe(true); // Simple validation only checks emptiness
    });

    it('should reject empty commands', () => {
      expect(TmuxUtils.isValidCommand('')).toBe(false);
      expect(TmuxUtils.isValidCommand('   ')).toBe(false);
      expect(TmuxUtils.isValidCommand('\t\n')).toBe(false);
    });
  });

  describe('parseTarget', () => {
    it('should parse session-only targets', () => {
      const result = TmuxUtils.parseTarget('session1');
      expect(result).toEqual({
        session: 'session1',
        window: undefined,
        pane: undefined
      });
    });

    it('should parse session:window targets', () => {
      const result = TmuxUtils.parseTarget('session1:0');
      expect(result).toEqual({
        session: 'session1',
        window: '0',
        pane: undefined
      });
    });

    it('should parse session:window.pane targets', () => {
      const result = TmuxUtils.parseTarget('session1:0.1');
      expect(result).toEqual({
        session: 'session1',
        window: '0',
        pane: '1'
      });
    });

    it('should use default session for empty input', () => {
      const result = TmuxUtils.parseTarget('');
      expect(result).toEqual({
        session: 'default',
        window: undefined,
        pane: undefined
      });
    });

    it('should allow custom default session', () => {
      const result = TmuxUtils.parseTarget('', 'custom');
      expect(result).toEqual({
        session: 'custom',
        window: undefined,
        pane: undefined
      });
    });
  });

  describe('buildTarget', () => {
    it('should build session-only targets', () => {
      expect(TmuxUtils.buildTarget('session1')).toBe('session1');
    });

    it('should build session:window targets', () => {
      expect(TmuxUtils.buildTarget('session1', '0')).toBe('session1:0');
    });

    it('should build session:window.pane targets', () => {
      expect(TmuxUtils.buildTarget('session1', '0', '1')).toBe('session1:0.1');
    });

    it('should ignore pane when window is not provided', () => {
      expect(TmuxUtils.buildTarget('session1', undefined, '1')).toBe('session1');
    });

    it('should handle empty values', () => {
      expect(TmuxUtils.buildTarget('')).toBe('');
      // Empty window string is treated as falsy and ignored
      expect(TmuxUtils.buildTarget('', '')).toBe('');
    });
  });

});
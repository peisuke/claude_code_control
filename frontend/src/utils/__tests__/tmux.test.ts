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

  describe('isValidTarget', () => {
    it('should validate basic targets', () => {
      expect(TmuxUtils.isValidTarget('session1')).toBe(true);
      expect(TmuxUtils.isValidTarget('my-session')).toBe(true);
      expect(TmuxUtils.isValidTarget('session1:0')).toBe(true);
      expect(TmuxUtils.isValidTarget('session1:0.1')).toBe(true);
    });

    it('should reject empty targets', () => {
      expect(TmuxUtils.isValidTarget('')).toBe(false);
      expect(TmuxUtils.isValidTarget('   ')).toBe(false);
    });

    it('should reject targets with invalid characters', () => {
      expect(TmuxUtils.isValidTarget('session<test')).toBe(false);
      expect(TmuxUtils.isValidTarget('session>test')).toBe(false);
      expect(TmuxUtils.isValidTarget('session"test')).toBe(false);
      expect(TmuxUtils.isValidTarget('session|test')).toBe(false);
      expect(TmuxUtils.isValidTarget('session*test')).toBe(false);
      expect(TmuxUtils.isValidTarget('session?test')).toBe(false);
    });

    it('should allow valid characters', () => {
      expect(TmuxUtils.isValidTarget('session-test')).toBe(true);
      expect(TmuxUtils.isValidTarget('session_test')).toBe(true);
      expect(TmuxUtils.isValidTarget('session123')).toBe(true);
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

    it('should handle empty session', () => {
      const result = TmuxUtils.parseTarget('');
      expect(result).toEqual({
        session: '',
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
      expect(TmuxUtils.buildTarget('', '')).toBe(':');
    });
  });

  describe('formatSessionName', () => {
    it('should replace underscores and hyphens with spaces', () => {
      expect(TmuxUtils.formatSessionName('my_session')).toBe('my session');
      expect(TmuxUtils.formatSessionName('my-session')).toBe('my session');
      expect(TmuxUtils.formatSessionName('my_long-session')).toBe('my long session');
    });

    it('should trim whitespace', () => {
      expect(TmuxUtils.formatSessionName('  session  ')).toBe('session');
      expect(TmuxUtils.formatSessionName('_session_')).toBe(' session ');
    });

    it('should handle empty strings', () => {
      expect(TmuxUtils.formatSessionName('')).toBe('');
      expect(TmuxUtils.formatSessionName('   ')).toBe('');
    });
  });
});
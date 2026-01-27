import { KEYBOARD_COMMANDS, KEYBOARD_LABELS, KEYBOARD_DESCRIPTIONS } from '../keyboard';

describe('keyboard constants', () => {
  describe('KEYBOARD_COMMANDS', () => {
    it('should have correct key codes', () => {
      expect(KEYBOARD_COMMANDS.CLEAR_SCREEN).toBe('\x0c');
      expect(KEYBOARD_COMMANDS.ESCAPE).toBe('\x1b');
      expect(KEYBOARD_COMMANDS.CTRL_C).toBe('\x03');
      expect(KEYBOARD_COMMANDS.CTRL_R).toBe('\x12');
      expect(KEYBOARD_COMMANDS.BACKSPACE).toBe('\x7f');
      expect(KEYBOARD_COMMANDS.ARROW_UP).toBe('\x1b[A');
      expect(KEYBOARD_COMMANDS.ARROW_DOWN).toBe('\x1b[B');
      expect(KEYBOARD_COMMANDS.SHIFT_TAB).toBe('\x1b[Z');
    });
  });

  describe('KEYBOARD_LABELS', () => {
    it('should have labels for all commands', () => {
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.CLEAR_SCREEN]).toBe('Clear');
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.ESCAPE]).toBe('ESC');
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.CTRL_C]).toBe('Ctrl+C');
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.CTRL_R]).toBe('Ctrl+R');
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.BACKSPACE]).toBe('Del');
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.ARROW_UP]).toBe('↑');
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.ARROW_DOWN]).toBe('↓');
      expect(KEYBOARD_LABELS[KEYBOARD_COMMANDS.SHIFT_TAB]).toBe('⇧+Tab');
    });
  });

  describe('KEYBOARD_DESCRIPTIONS', () => {
    it('should have descriptions for all commands', () => {
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.CLEAR_SCREEN]).toBe('画面をクリア');
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.ESCAPE]).toBe('ESCキーを送信');
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.CTRL_C]).toBe('プロセス終了');
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.CTRL_R]).toBe('履歴展開');
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.BACKSPACE]).toBe('Backspaceキーを送信');
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.ARROW_UP]).toBe('上矢印キー');
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.ARROW_DOWN]).toBe('下矢印キー');
      expect(KEYBOARD_DESCRIPTIONS[KEYBOARD_COMMANDS.SHIFT_TAB]).toBe('前方移動');
    });
  });
});

/// Keyboard constants for tmux command execution.
/// Port of frontend/src/constants/keyboard.ts
class KeyboardCommands {
  KeyboardCommands._();

  static const String clearScreen = '\x0c';
  static const String escape = '\x1b';
  static const String ctrlC = '\x03';
  static const String ctrlO = '\x0f';
  static const String backspace = '\x7f';
  static const String arrowUp = '\x1b[A';
  static const String arrowDown = '\x1b[B';
  static const String shiftTab = '\x1b[Z';
}

const Map<String, String> keyboardLabels = {
  KeyboardCommands.clearScreen: 'Clear',
  KeyboardCommands.escape: 'ESC',
  KeyboardCommands.ctrlC: 'Ctrl+C',
  KeyboardCommands.ctrlO: 'Ctrl+O',
  KeyboardCommands.backspace: 'Del',
  KeyboardCommands.arrowUp: '↑',
  KeyboardCommands.arrowDown: '↓',
  KeyboardCommands.shiftTab: '⇧+Tab',
};

const Map<String, String> keyboardDescriptions = {
  KeyboardCommands.clearScreen: '画面をクリア',
  KeyboardCommands.escape: 'ESCキーを送信',
  KeyboardCommands.ctrlC: 'プロセス終了',
  KeyboardCommands.ctrlO: '履歴展開',
  KeyboardCommands.backspace: 'Backspaceキーを送信',
  KeyboardCommands.arrowUp: '上矢印キー',
  KeyboardCommands.arrowDown: '下矢印キー',
  KeyboardCommands.shiftTab: '前方移動',
};

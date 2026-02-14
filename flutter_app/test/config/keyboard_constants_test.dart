/// Port of frontend/src/constants/__tests__/keyboard.test.ts (7 test cases → 3 groups)
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/config/keyboard_constants.dart';

void main() {
  group('keyboard constants', () {
    group('KeyboardCommands', () {
      test('should have correct key codes', () {
        expect(KeyboardCommands.clearScreen, '\x0c');
        expect(KeyboardCommands.escape, '\x1b');
        expect(KeyboardCommands.ctrlC, '\x03');
        expect(KeyboardCommands.ctrlO, '\x0f');
        expect(KeyboardCommands.backspace, '\x7f');
        expect(KeyboardCommands.arrowUp, '\x1b[A');
        expect(KeyboardCommands.arrowDown, '\x1b[B');
        expect(KeyboardCommands.shiftTab, '\x1b[Z');
      });
    });

    group('keyboardLabels', () {
      test('should have labels for all commands', () {
        expect(keyboardLabels[KeyboardCommands.clearScreen], 'Clear');
        expect(keyboardLabels[KeyboardCommands.escape], 'ESC');
        expect(keyboardLabels[KeyboardCommands.ctrlC], 'Ctrl+C');
        expect(keyboardLabels[KeyboardCommands.ctrlO], 'Ctrl+O');
        expect(keyboardLabels[KeyboardCommands.backspace], 'Del');
        expect(keyboardLabels[KeyboardCommands.arrowUp], '↑');
        expect(keyboardLabels[KeyboardCommands.arrowDown], '↓');
        expect(keyboardLabels[KeyboardCommands.shiftTab], '⇧+Tab');
      });
    });

    group('keyboardDescriptions', () {
      test('should have descriptions for all commands', () {
        expect(keyboardDescriptions[KeyboardCommands.clearScreen], '画面をクリア');
        expect(keyboardDescriptions[KeyboardCommands.escape], 'ESCキーを送信');
        expect(keyboardDescriptions[KeyboardCommands.ctrlC], 'プロセス終了');
        expect(keyboardDescriptions[KeyboardCommands.ctrlO], '履歴展開');
        expect(keyboardDescriptions[KeyboardCommands.backspace], 'Backspaceキーを送信');
        expect(keyboardDescriptions[KeyboardCommands.arrowUp], '上矢印キー');
        expect(keyboardDescriptions[KeyboardCommands.arrowDown], '下矢印キー');
        expect(keyboardDescriptions[KeyboardCommands.shiftTab], '前方移動');
      });
    });
  });
}

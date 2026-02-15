/// Port of frontend/src/hooks/__tests__/useChoiceDetection.test.ts (11 test cases)
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/utils/choice_detector.dart';

void main() {
  group('ChoiceDetector', () {
    test('returns empty array for empty output', () {
      expect(ChoiceDetector.detect(''), isEmpty);
    });

    test('detects yes/no choices as buttons', () {
      const output = 'Some prompt text\n1. Yes\n2. No';
      final result = ChoiceDetector.detect(output);
      expect(result.length, 2);
      expect(result[0].number, 1);
      expect(result[0].text, 'Yes');
      expect(result[1].number, 2);
      expect(result[1].text, 'No');
    });

    test('returns empty for non-yes/no choices (general text)', () {
      const output = 'Pick one:\n1. Option A\n2. Option B\n3. Option C';
      expect(ChoiceDetector.detect(output), isEmpty);
    });

    test('returns empty for single choice (needs 2+)', () {
      const output = '1. Only option';
      expect(ChoiceDetector.detect(output), isEmpty);
    });

    test('returns empty for non-sequential numbers', () {
      const output = '2. Skipped\n3. Also skipped';
      expect(ChoiceDetector.detect(output), isEmpty);
    });

    test('returns empty for no matching patterns', () {
      const output = 'Just some regular output\nNo choices here';
      expect(ChoiceDetector.detect(output), isEmpty);
    });

    test('only looks at tail lines', () {
      final lines = List.generate(30, (i) => 'line $i');
      lines.addAll(['1. Yes', '2. No']);
      final output = lines.join('\n');
      final result = ChoiceDetector.detect(output);
      expect(result.length, 2);
      expect(result[0].number, 1);
      expect(result[0].text, 'Yes');
      expect(result[1].number, 2);
      expect(result[1].text, 'No');
    });

    test('strips ANSI escape sequences from choice text', () {
      const output = 'Pick:\n\x1b[32m1. Yes\x1b[0m\n\x1b[32m2. No\x1b[0m';
      final result = ChoiceDetector.detect(output);
      expect(result.length, 2);
      expect(result[0].number, 1);
      expect(result[0].text, 'Yes');
      expect(result[1].number, 2);
      expect(result[1].text, 'No');
    });

    test('handles choices with extra whitespace', () {
      const output = '  1. Yes  \n  2. No  ';
      final result = ChoiceDetector.detect(output);
      expect(result.length, 2);
      expect(result[0].number, 1);
      expect(result[0].text, 'Yes');
      expect(result[1].number, 2);
      expect(result[1].text, 'No');
    });

    test('returns empty for non-yes/no words like ok/cancel', () {
      const output = '1. OK\n2. Cancel';
      expect(ChoiceDetector.detect(output), isEmpty);
    });
  });
}

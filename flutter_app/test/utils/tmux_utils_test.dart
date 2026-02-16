/// Port of frontend/src/utils/__tests__/tmux.test.ts (20 test cases)
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/utils/tmux_utils.dart';

void main() {
  group('TmuxUtils', () {
    // ── sanitizeCommand ──────────────────────────────────
    group('sanitizeCommand', () {
      test('should trim whitespace from commands', () {
        expect(TmuxUtils.sanitizeCommand('  ls  '), 'ls');
        expect(TmuxUtils.sanitizeCommand('\techo hello\n'), 'echo hello');
      });

      test('should handle empty and whitespace-only commands', () {
        expect(TmuxUtils.sanitizeCommand(''), '');
        expect(TmuxUtils.sanitizeCommand('   '), '');
        expect(TmuxUtils.sanitizeCommand('\t\n'), '');
      });

      test('should return trimmed command without modification', () {
        expect(TmuxUtils.sanitizeCommand('rm -rf /'), 'rm -rf /');
        expect(TmuxUtils.sanitizeCommand('ls -la'), 'ls -la');
      });
    });

    // ── isValidCommand ───────────────────────────────────
    group('isValidCommand', () {
      test('should validate non-empty commands', () {
        expect(TmuxUtils.isValidCommand('ls'), isTrue);
        expect(TmuxUtils.isValidCommand('pwd'), isTrue);
        expect(TmuxUtils.isValidCommand('echo hello'), isTrue);
        expect(TmuxUtils.isValidCommand('rm -rf /'), isTrue);
      });

      test('should reject empty commands', () {
        expect(TmuxUtils.isValidCommand(''), isFalse);
        expect(TmuxUtils.isValidCommand('   '), isFalse);
        expect(TmuxUtils.isValidCommand('\t\n'), isFalse);
      });
    });

    // ── parseTarget ──────────────────────────────────────
    group('parseTarget', () {
      test('should parse session-only targets', () {
        final result = TmuxUtils.parseTarget('session1');
        expect(result, const TmuxTarget(session: 'session1'));
      });

      test('should parse session:window targets', () {
        final result = TmuxUtils.parseTarget('session1:0');
        expect(result, const TmuxTarget(session: 'session1', window: '0'));
      });

      test('should parse session:window.pane targets', () {
        final result = TmuxUtils.parseTarget('session1:0.1');
        expect(
          result,
          const TmuxTarget(session: 'session1', window: '0', pane: '1'),
        );
      });

      test('should use empty session for empty input', () {
        final result = TmuxUtils.parseTarget('');
        expect(result, const TmuxTarget(session: ''));
      });

      test('should allow custom default session', () {
        final result = TmuxUtils.parseTarget('', 'custom');
        expect(result, const TmuxTarget(session: 'custom'));
      });
    });

    // ── buildTarget ──────────────────────────────────────
    group('buildTarget', () {
      test('should build session-only targets', () {
        expect(TmuxUtils.buildTarget('session1'), 'session1');
      });

      test('should build session:window targets', () {
        expect(TmuxUtils.buildTarget('session1', '0'), 'session1:0');
      });

      test('should build session:window.pane targets', () {
        expect(TmuxUtils.buildTarget('session1', '0', '1'), 'session1:0.1');
      });

      test('should ignore pane when window is not provided', () {
        expect(TmuxUtils.buildTarget('session1', null, '1'), 'session1');
      });

      test('should handle empty values', () {
        expect(TmuxUtils.buildTarget(''), '');
        expect(TmuxUtils.buildTarget('', ''), '');
      });
    });
  });
}

/// ANSI parser tests.
/// No direct web equivalent (web uses ansi-to-html library).
/// Tests the custom Flutter ANSI SGR → TextSpan parser.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/utils/ansi_parser.dart';

void main() {
  final baseStyle = const TextStyle(
    color: Color(0xFFCCCCCC),
    fontSize: 14,
  );

  group('AnsiParser', () {
    // ── Basic text ───────────────────────────────────────────
    group('basic text', () {
      test('should parse empty line as single space span', () {
        final spans = AnsiParser.parseLine('', baseStyle);
        expect(spans.length, 1);
        expect(spans[0].text, ' ');
      });

      test('should parse plain text without escape sequences', () {
        final spans = AnsiParser.parseLine('hello world', baseStyle);
        expect(spans.length, 1);
        expect(spans[0].text, 'hello world');
      });

      test('should preserve whitespace in text', () {
        final spans = AnsiParser.parseLine('  indented  text  ', baseStyle);
        expect(spans.length, 1);
        expect(spans[0].text, '  indented  text  ');
      });
    });

    // ── Standard colors ──────────────────────────────────────
    group('standard foreground colors', () {
      test('should parse red foreground (SGR 31)', () {
        final spans = AnsiParser.parseLine('\x1b[31mred text\x1b[0m', baseStyle);
        expect(spans.length, greaterThanOrEqualTo(1));
        final redSpan = spans.firstWhere((s) => s.text == 'red text');
        expect(redSpan.style?.color, const Color(0xFFAA0000));
      });

      test('should parse green foreground (SGR 32)', () {
        final spans = AnsiParser.parseLine('\x1b[32mgreen\x1b[0m', baseStyle);
        final greenSpan = spans.firstWhere((s) => s.text == 'green');
        expect(greenSpan.style?.color, const Color(0xFF00AA00));
      });

      test('should parse all 8 standard colors', () {
        // SGR 30-37
        const expected = [
          Color(0xFF000000), // Black
          Color(0xFFAA0000), // Red
          Color(0xFF00AA00), // Green
          Color(0xFFAA5500), // Yellow
          Color(0xFF0000AA), // Blue
          Color(0xFFAA00AA), // Magenta
          Color(0xFF00AAAA), // Cyan
          Color(0xFFAAAAAA), // White
        ];
        for (var i = 0; i < 8; i++) {
          final code = 30 + i;
          final spans = AnsiParser.parseLine(
            '\x1b[${code}mcolor$i\x1b[0m',
            baseStyle,
          );
          final span = spans.firstWhere((s) => s.text == 'color$i');
          expect(span.style?.color, expected[i],
              reason: 'SGR $code should map to ${expected[i]}');
        }
      });
    });

    // ── Bright colors ────────────────────────────────────────
    group('bright foreground colors', () {
      test('should parse bright red (SGR 91)', () {
        final spans = AnsiParser.parseLine('\x1b[91mbright red\x1b[0m', baseStyle);
        final span = spans.firstWhere((s) => s.text == 'bright red');
        expect(span.style?.color, const Color(0xFFFF5555));
      });
    });

    // ── Background colors ────────────────────────────────────
    group('background colors', () {
      test('should parse red background (SGR 41)', () {
        final spans = AnsiParser.parseLine('\x1b[41mbg red\x1b[0m', baseStyle);
        final span = spans.firstWhere((s) => s.text == 'bg red');
        expect(span.style?.backgroundColor, const Color(0xFFAA0000));
      });
    });

    // ── 256 colors ───────────────────────────────────────────
    group('256-color mode', () {
      test('should parse 256-color foreground (38;5;n)', () {
        // Color index 196 = bright red in 216-color cube
        final spans = AnsiParser.parseLine(
          '\x1b[38;5;196mcolor256\x1b[0m',
          baseStyle,
        );
        final span = spans.firstWhere((s) => s.text == 'color256');
        expect(span.style?.color, isNotNull);
      });

      test('should parse 256-color background (48;5;n)', () {
        final spans = AnsiParser.parseLine(
          '\x1b[48;5;21mbg256\x1b[0m',
          baseStyle,
        );
        final span = spans.firstWhere((s) => s.text == 'bg256');
        expect(span.style?.backgroundColor, isNotNull);
      });

      test('should handle grayscale ramp (232-255)', () {
        final spans = AnsiParser.parseLine(
          '\x1b[38;5;240mgray\x1b[0m',
          baseStyle,
        );
        final span = spans.firstWhere((s) => s.text == 'gray');
        expect(span.style?.color, isNotNull);
      });
    });

    // ── 24-bit RGB ───────────────────────────────────────────
    group('24-bit true color', () {
      test('should parse RGB foreground (38;2;r;g;b)', () {
        final spans = AnsiParser.parseLine(
          '\x1b[38;2;255;128;0mrgb\x1b[0m',
          baseStyle,
        );
        final span = spans.firstWhere((s) => s.text == 'rgb');
        expect(span.style?.color, const Color(0xFFFF8000));
      });

      test('should parse RGB background (48;2;r;g;b)', () {
        final spans = AnsiParser.parseLine(
          '\x1b[48;2;0;128;255mbgrgb\x1b[0m',
          baseStyle,
        );
        final span = spans.firstWhere((s) => s.text == 'bgrgb');
        expect(span.style?.backgroundColor, const Color(0xFF0080FF));
      });
    });

    // ── Text decorations ─────────────────────────────────────
    group('text decorations', () {
      test('should parse bold (SGR 1)', () {
        final spans = AnsiParser.parseLine('\x1b[1mbold\x1b[0m', baseStyle);
        final span = spans.firstWhere((s) => s.text == 'bold');
        expect(span.style?.fontWeight, FontWeight.bold);
      });

      test('should parse italic (SGR 3)', () {
        final spans = AnsiParser.parseLine('\x1b[3mitalic\x1b[0m', baseStyle);
        final span = spans.firstWhere((s) => s.text == 'italic');
        expect(span.style?.fontStyle, FontStyle.italic);
      });

      test('should parse underline (SGR 4)', () {
        final spans = AnsiParser.parseLine('\x1b[4munderline\x1b[0m', baseStyle);
        final span = spans.firstWhere((s) => s.text == 'underline');
        expect(span.style?.decoration, TextDecoration.underline);
      });

      test('should parse strikethrough (SGR 9)', () {
        final spans = AnsiParser.parseLine('\x1b[9mstrike\x1b[0m', baseStyle);
        final span = spans.firstWhere((s) => s.text == 'strike');
        expect(span.style?.decoration, TextDecoration.lineThrough);
      });

      test('should parse dim (SGR 2) as reduced opacity', () {
        final spans = AnsiParser.parseLine('\x1b[2mdim\x1b[0m', baseStyle);
        final span = spans.firstWhere((s) => s.text == 'dim');
        // Dim should reduce alpha
        expect(span.style?.color?.a, lessThan(1.0));
      });
    });

    // ── Reset ────────────────────────────────────────────────
    group('reset', () {
      test('should reset all attributes with SGR 0', () {
        final spans = AnsiParser.parseLine(
          '\x1b[1;31mbold red\x1b[0mnormal',
          baseStyle,
        );
        final normalSpan = spans.firstWhere((s) => s.text == 'normal');
        expect(normalSpan.style?.fontWeight, FontWeight.normal);
        expect(normalSpan.style?.color, baseStyle.color);
      });

      test('should reset with empty ESC[m', () {
        final spans = AnsiParser.parseLine(
          '\x1b[31mred\x1b[mnormal',
          baseStyle,
        );
        final normalSpan = spans.firstWhere((s) => s.text == 'normal');
        expect(normalSpan.style?.color, baseStyle.color);
      });
    });

    // ── Combined codes ───────────────────────────────────────
    group('combined codes', () {
      test('should handle multiple codes in one sequence', () {
        // Bold + Red + Underline
        final spans = AnsiParser.parseLine(
          '\x1b[1;31;4mcombined\x1b[0m',
          baseStyle,
        );
        final span = spans.firstWhere((s) => s.text == 'combined');
        expect(span.style?.fontWeight, FontWeight.bold);
        expect(span.style?.color, const Color(0xFFAA0000));
        expect(span.style?.decoration, TextDecoration.underline);
      });

      test('should handle sequential escape sequences', () {
        final spans = AnsiParser.parseLine(
          '\x1b[31mred\x1b[32mgreen\x1b[0m',
          baseStyle,
        );
        final redSpan = spans.firstWhere((s) => s.text == 'red');
        final greenSpan = spans.firstWhere((s) => s.text == 'green');
        expect(redSpan.style?.color, const Color(0xFFAA0000));
        expect(greenSpan.style?.color, const Color(0xFF00AA00));
      });
    });

    // ── stripAnsi ────────────────────────────────────────────
    group('stripAnsi', () {
      test('should strip all ANSI sequences', () {
        expect(
          AnsiParser.stripAnsi('\x1b[31mred\x1b[0m text'),
          'red text',
        );
      });

      test('should handle text without ANSI sequences', () {
        expect(AnsiParser.stripAnsi('plain text'), 'plain text');
      });

      test('should handle empty string', () {
        expect(AnsiParser.stripAnsi(''), '');
      });

      test('should strip complex sequences', () {
        expect(
          AnsiParser.stripAnsi('\x1b[1;38;2;255;0;0mbold rgb\x1b[0m'),
          'bold rgb',
        );
      });
    });
  });
}

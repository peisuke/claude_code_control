import 'package:flutter/material.dart';

/// Parses ANSI SGR escape sequences into Flutter TextSpans.
///
/// Supports: standard 8 colors, bright colors, 256-color, 24-bit RGB,
/// bold, dim, italic, underline, strikethrough, reverse video.
class AnsiParser {
  AnsiParser._();

  // Standard 8 colors (SGR 30-37 / 40-47)
  static const List<Color> _standardColors = [
    Color(0xFF000000), // Black
    Color(0xFFAA0000), // Red
    Color(0xFF00AA00), // Green
    Color(0xFFAA5500), // Yellow (brown)
    Color(0xFF0000AA), // Blue
    Color(0xFFAA00AA), // Magenta
    Color(0xFF00AAAA), // Cyan
    Color(0xFFAAAAAA), // White
  ];

  // Bright 8 colors (SGR 90-97 / 100-107)
  static const List<Color> _brightColors = [
    Color(0xFF555555), // Bright Black (gray)
    Color(0xFFFF5555), // Bright Red
    Color(0xFF55FF55), // Bright Green
    Color(0xFFFFFF55), // Bright Yellow
    Color(0xFF5555FF), // Bright Blue
    Color(0xFFFF55FF), // Bright Magenta
    Color(0xFF55FFFF), // Bright Cyan
    Color(0xFFFFFFFF), // Bright White
  ];

  static final RegExp _ansiPattern = RegExp(r'\x1b\[([0-9;]*)([a-zA-Z])');

  /// Parse a single line of text with ANSI codes into a list of TextSpans.
  static List<TextSpan> parseLine(String line, TextStyle baseStyle) {
    if (line.isEmpty) {
      return [TextSpan(text: ' ', style: baseStyle)];
    }

    final spans = <TextSpan>[];
    var currentFg = baseStyle.color;
    var currentBg = baseStyle.backgroundColor;
    var bold = false;
    var dim = false;
    var italic = false;
    var underline = false;
    var strikethrough = false;
    var reverse = false;

    int lastEnd = 0;

    for (final match in _ansiPattern.allMatches(line)) {
      // Add text before this escape sequence
      if (match.start > lastEnd) {
        final text = line.substring(lastEnd, match.start);
        spans.add(TextSpan(
          text: text,
          style: _buildStyle(
            baseStyle,
            fg: reverse ? currentBg : currentFg,
            bg: reverse ? currentFg : currentBg,
            bold: bold,
            dim: dim,
            italic: italic,
            underline: underline,
            strikethrough: strikethrough,
          ),
        ));
      }
      lastEnd = match.end;

      final code = match.group(2);
      if (code != 'm') continue; // Only handle SGR sequences

      final params = match.group(1) ?? '';
      if (params.isEmpty) {
        // Reset all
        currentFg = baseStyle.color;
        currentBg = baseStyle.backgroundColor;
        bold = false;
        dim = false;
        italic = false;
        underline = false;
        strikethrough = false;
        reverse = false;
        continue;
      }

      final parts = params.split(';').map((s) => int.tryParse(s) ?? 0).toList();
      var i = 0;
      while (i < parts.length) {
        final p = parts[i];
        switch (p) {
          case 0:
            currentFg = baseStyle.color;
            currentBg = baseStyle.backgroundColor;
            bold = false;
            dim = false;
            italic = false;
            underline = false;
            strikethrough = false;
            reverse = false;
          case 1:
            bold = true;
          case 2:
            dim = true;
          case 3:
            italic = true;
          case 4:
            underline = true;
          case 7:
            reverse = true;
          case 9:
            strikethrough = true;
          case 22:
            bold = false;
            dim = false;
          case 23:
            italic = false;
          case 24:
            underline = false;
          case 27:
            reverse = false;
          case 29:
            strikethrough = false;
          // Standard foreground colors
          case >= 30 && <= 37:
            currentFg = _standardColors[p - 30];
          case 38:
            // Extended foreground: 38;5;n (256-color) or 38;2;r;g;b (24-bit)
            if (i + 1 < parts.length && parts[i + 1] == 5 && i + 2 < parts.length) {
              currentFg = _color256(parts[i + 2]);
              i += 2;
            } else if (i + 1 < parts.length && parts[i + 1] == 2 && i + 4 < parts.length) {
              currentFg = Color.fromARGB(255, parts[i + 2], parts[i + 3], parts[i + 4]);
              i += 4;
            }
          case 39:
            currentFg = baseStyle.color;
          // Standard background colors
          case >= 40 && <= 47:
            currentBg = _standardColors[p - 40];
          case 48:
            // Extended background
            if (i + 1 < parts.length && parts[i + 1] == 5 && i + 2 < parts.length) {
              currentBg = _color256(parts[i + 2]);
              i += 2;
            } else if (i + 1 < parts.length && parts[i + 1] == 2 && i + 4 < parts.length) {
              currentBg = Color.fromARGB(255, parts[i + 2], parts[i + 3], parts[i + 4]);
              i += 4;
            }
          case 49:
            currentBg = baseStyle.backgroundColor;
          // Bright foreground
          case >= 90 && <= 97:
            currentFg = _brightColors[p - 90];
          // Bright background
          case >= 100 && <= 107:
            currentBg = _brightColors[p - 100];
        }
        i++;
      }
    }

    // Remaining text after last escape
    if (lastEnd < line.length) {
      final text = line.substring(lastEnd);
      spans.add(TextSpan(
        text: text,
        style: _buildStyle(
          baseStyle,
          fg: reverse ? currentBg : currentFg,
          bg: reverse ? currentFg : currentBg,
          bold: bold,
          dim: dim,
          italic: italic,
          underline: underline,
          strikethrough: strikethrough,
        ),
      ));
    }

    if (spans.isEmpty) {
      spans.add(TextSpan(text: ' ', style: baseStyle));
    }

    return spans;
  }

  static TextStyle _buildStyle(
    TextStyle base, {
    Color? fg,
    Color? bg,
    bool bold = false,
    bool dim = false,
    bool italic = false,
    bool underline = false,
    bool strikethrough = false,
  }) {
    var color = fg ?? base.color;
    if (dim && color != null) {
      color = color.withValues(alpha: 0.5);
    }

    return base.copyWith(
      color: color,
      backgroundColor: bg,
      fontWeight: bold ? FontWeight.bold : FontWeight.normal,
      fontStyle: italic ? FontStyle.italic : FontStyle.normal,
      decoration: TextDecoration.combine([
        if (underline) TextDecoration.underline,
        if (strikethrough) TextDecoration.lineThrough,
      ]),
    );
  }

  /// 256-color lookup (0-255)
  static Color _color256(int n) {
    if (n < 8) return _standardColors[n];
    if (n < 16) return _brightColors[n - 8];

    // 216-color cube (indices 16-231)
    if (n < 232) {
      final idx = n - 16;
      final r = (idx ~/ 36) * 51;
      final g = ((idx % 36) ~/ 6) * 51;
      final b = (idx % 6) * 51;
      return Color.fromARGB(255, r, g, b);
    }

    // Grayscale ramp (indices 232-255)
    final gray = 8 + (n - 232) * 10;
    return Color.fromARGB(255, gray, gray, gray);
  }

  /// Strip all ANSI escape sequences from text.
  static String stripAnsi(String text) {
    return text.replaceAll(RegExp(r'\x1b\[[0-9;]*[a-zA-Z]'), '');
  }
}

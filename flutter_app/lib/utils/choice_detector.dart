import '../config/app_config.dart';
import 'ansi_parser.dart';

class Choice {
  final int number;
  final String text;

  const Choice({required this.number, required this.text});
}

/// Detects numbered choice menus (e.g., "1. Yes\n2. No") in terminal output.
/// Only returns choices for Yes/No style menus.
class ChoiceDetector {
  ChoiceDetector._();

  static final RegExp _choicePattern = RegExp(r'(\d+)\.\s+(.+)$');
  static const List<String> _yesNoPrefixes = ['Yes', 'No'];

  static List<Choice> detect(String output) {
    if (output.isEmpty) return [];

    final lines = output.trimRight().split('\n');
    final tail = lines.length > AppConfig.choiceTailLines
        ? lines.sublist(lines.length - AppConfig.choiceTailLines)
        : lines;

    final matchedLines = <({int index, int number, String text})>[];

    for (var i = 0; i < tail.length; i++) {
      final cleaned = AnsiParser.stripAnsi(tail[i]).trim();
      final match = _choicePattern.firstMatch(cleaned);
      if (match != null) {
        matchedLines.add((
          index: i,
          number: int.parse(match.group(1)!),
          text: match.group(2)!,
        ));
      }
    }

    if (matchedLines.length < 2) return [];

    // Find consecutive sequence ending at the last matched line
    final result = [matchedLines.last];
    for (var i = matchedLines.length - 2; i >= 0; i--) {
      if (matchedLines[i].number == result.first.number - 1) {
        result.insert(0, matchedLines[i]);
      }
    }

    if (result.length < 2 || result.first.number != 1) return [];

    final choices =
        result.map((m) => Choice(number: m.number, text: m.text)).toList();

    // Only show buttons for Yes/No style choices
    final isYesNo = choices.every((c) {
      final text = c.text.trim();
      return _yesNoPrefixes.any((prefix) => text.startsWith(prefix));
    });

    return isYesNo ? choices : [];
  }
}

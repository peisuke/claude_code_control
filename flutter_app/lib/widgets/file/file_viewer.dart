import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:highlight/highlight.dart' show highlight, Node;
import 'package:flutter_highlight/themes/atom-one-dark.dart';
import '../../config/language_map.dart';
import '../../models/file_node.dart';
import '../../providers/file_provider.dart';

/// Theme used for syntax highlighting (dark).
/// Using Atom One Dark — close match to the web's Prism "tomorrow" dark theme.
const _highlightTheme = atomOneDarkTheme;

class FileViewer extends ConsumerWidget {
  const FileViewer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(fileProvider);
    final theme = Theme.of(context);

    if (state.isLoadingContent) {
      return const Center(child: CircularProgressIndicator());
    }

    // Error display — matches web's <Alert severity="error"> pattern.
    if (state.contentError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline,
                  size: 48, color: theme.colorScheme.error),
              const SizedBox(height: 16),
              Text(
                state.contentError!,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.error),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              TextButton.icon(
                onPressed: () =>
                    ref.read(fileProvider.notifier).clearSelectedFile(),
                icon: const Icon(Icons.close, size: 18),
                label: const Text('Dismiss'),
              ),
            ],
          ),
        ),
      );
    }

    final file = state.selectedFile;
    if (file == null) {
      return Center(
        child: Text(
          'Select a file to view',
          style: theme.textTheme.bodyMedium
              ?.copyWith(color: theme.hintColor),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // File path header
        Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            border: Border(
                bottom: BorderSide(color: theme.dividerColor)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  file.path,
                  style: theme.textTheme.bodySmall
                      ?.copyWith(fontFamily: 'monospace'),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: () =>
                    ref.read(fileProvider.notifier).clearSelectedFile(),
                tooltip: 'Close',
                constraints:
                    const BoxConstraints(minWidth: 28, minHeight: 28),
                padding: EdgeInsets.zero,
                iconSize: 18,
              ),
            ],
          ),
        ),
        // Content
        Expanded(
          child: _buildContentViewer(context, file),
        ),
      ],
    );
  }

  Widget _buildContentViewer(BuildContext context, FileContentResponse file) {
    // Binary files — show placeholder
    if (file.isBinary) {
      return _buildBinaryPlaceholder(context, file.path);
    }

    final isSvg = file.path.toLowerCase().endsWith('.svg');

    if (file.isImage && !isSvg) {
      return _buildImageViewer(file.content);
    }

    // SVG or image with base64-encoded content: decode to text for display.
    if (file.isImage && isSvg) {
      try {
        final decoded = utf8.decode(base64Decode(file.content));
        return _buildHighlightedViewer(context, decoded, file.path);
      } catch (_) {
        return _buildHighlightedViewer(context, file.content, file.path);
      }
    }

    return _buildHighlightedViewer(context, file.content, file.path);
  }

  Widget _buildBinaryPlaceholder(BuildContext context, String path) {
    final theme = Theme.of(context);
    final fileName = path.split('/').last;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.block, size: 48, color: theme.hintColor),
          const SizedBox(height: 16),
          Text(
            'Cannot display binary file',
            style: theme.textTheme.titleMedium
                ?.copyWith(color: theme.hintColor),
          ),
          const SizedBox(height: 4),
          Text(
            fileName,
            style: theme.textTheme.bodySmall
                ?.copyWith(color: theme.hintColor),
          ),
        ],
      ),
    );
  }

  Widget _buildImageViewer(String base64Content) {
    try {
      final bytes = base64Decode(base64Content);
      return InteractiveViewer(
        child: Center(
          child: Image.memory(bytes, fit: BoxFit.contain),
        ),
      );
    } catch (_) {
      return const Center(child: Text('Failed to load image'));
    }
  }

  Widget _buildHighlightedViewer(
      BuildContext context, String content, String filePath) {
    final lines = content.split('\n');
    final lineNumberWidth = '${lines.length}'.length * 10.0 + 16.0;

    // Attempt syntax highlighting
    final language = getLanguageFromFileName(filePath);
    List<List<TextSpan>>? highlightedLines;
    if (language != null) {
      try {
        final result = highlight.parse(content, language: language);
        if (result.nodes != null) {
          highlightedLines = _splitNodesByLine(result.nodes!);
        }
      } catch (_) {
        // Fallback to plain text on parse error
      }
    }

    final rootStyle = _highlightTheme['root'];
    final bgColor = rootStyle?.backgroundColor ?? const Color(0xff282c34);
    final defaultColor = rootStyle?.color ?? const Color(0xffc5c8c6);

    return Container(
      color: bgColor,
      child: SelectionArea(
        child: ListView.builder(
          padding: EdgeInsets.zero,
          itemCount: lines.length,
          itemBuilder: (context, index) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Line number
                Container(
                  width: lineNumberWidth,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 1),
                  alignment: Alignment.centerRight,
                  child: Text(
                    '${index + 1}',
                    style: GoogleFonts.ubuntuMono(
                      fontSize: 12,
                      color: const Color(0xff6e7681),
                    ),
                  ),
                ),
                // Content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 1),
                    child: highlightedLines != null &&
                            index < highlightedLines.length
                        ? Text.rich(
                            TextSpan(
                              children: highlightedLines[index],
                              style: GoogleFonts.ubuntuMono(
                                fontSize: 12,
                                color: defaultColor,
                              ),
                            ),
                          )
                        : Text(
                            lines[index],
                            style: GoogleFonts.ubuntuMono(
                              fontSize: 12,
                              color: defaultColor,
                            ),
                            softWrap: true,
                          ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  /// Convert highlight.js [Node] tree into per-line [TextSpan] lists.
  ///
  /// The highlight parser returns a flat/nested tree of Nodes for the entire
  /// file. We need to split these into per-line lists so that [ListView.builder]
  /// can lazily render each line independently.
  List<List<TextSpan>> _splitNodesByLine(List<Node> nodes) {
    final List<List<TextSpan>> lines = [[]];

    void traverse(Node node, TextStyle? parentStyle) {
      final style = node.className != null
          ? _highlightTheme[node.className!] ?? parentStyle
          : parentStyle;

      if (node.value != null) {
        // Leaf node — split its text by newlines
        final parts = node.value!.split('\n');
        for (var i = 0; i < parts.length; i++) {
          if (i > 0) {
            lines.add([]); // Start new line
          }
          if (parts[i].isNotEmpty) {
            lines.last.add(TextSpan(text: parts[i], style: style));
          }
        }
      } else if (node.children != null) {
        for (final child in node.children!) {
          traverse(child, style);
        }
      }
    }

    for (final node in nodes) {
      traverse(node, null);
    }

    return lines;
  }
}

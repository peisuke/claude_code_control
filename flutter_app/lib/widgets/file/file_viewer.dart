import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../providers/file_provider.dart';

class FileViewer extends ConsumerWidget {
  const FileViewer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(fileProvider);
    final theme = Theme.of(context);

    if (state.isLoadingContent) {
      return const Center(child: CircularProgressIndicator());
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
          child: file.isImage && !file.path.toLowerCase().endsWith('.svg')
              ? _buildImageViewer(file.content)
              : _buildTextViewer(context, file.content),
        ),
      ],
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

  Widget _buildTextViewer(BuildContext context, String content) {
    final lines = content.split('\n');
    final lineNumberWidth =
        '${lines.length}'.length * 10.0 + 16.0;

    return ListView.builder(
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
              color: Theme.of(context)
                  .colorScheme
                  .surfaceContainerHighest
                  .withValues(alpha: 0.5),
              child: Text(
                '${index + 1}',
                style: GoogleFonts.ubuntuMono(
                  fontSize: 12,
                  color: Theme.of(context).hintColor,
                ),
              ),
            ),
            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 1),
                child: Text(
                  lines[index],
                  style: GoogleFonts.ubuntuMono(fontSize: 12),
                  softWrap: true,
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

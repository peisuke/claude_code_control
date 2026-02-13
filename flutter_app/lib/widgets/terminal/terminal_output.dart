import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_config.dart';
import '../../config/theme.dart';
import '../../providers/output_provider.dart';
import '../../providers/terminal_resize_provider.dart';
import '../../utils/ansi_parser.dart';

class TerminalOutput extends ConsumerStatefulWidget {
  const TerminalOutput({super.key});

  @override
  ConsumerState<TerminalOutput> createState() => _TerminalOutputState();
}

class _TerminalOutputState extends ConsumerState<TerminalOutput> {
  final ScrollController _scrollController = ScrollController();
  bool _userScrolledUp = false;
  double _previousScrollHeight = 0;
  final Map<int, List<TextSpan>> _lineCache = {};
  String _lastContent = '';

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) return;

    final position = _scrollController.position;
    final distanceFromBottom =
        position.maxScrollExtent - position.pixels;
    final atBottom = distanceFromBottom < AppConfig.bottomThreshold;

    if (atBottom != !_userScrolledUp) {
      setState(() {
        _userScrolledUp = !atBottom;
      });
      ref.read(outputProvider.notifier).setIsAtBottom(atBottom);
    }

    // Load history when near top
    final isScrollingUp = position.pixels < _previousScrollHeight;
    _previousScrollHeight = position.pixels;

    if (isScrollingUp &&
        position.pixels < AppConfig.scrollThreshold &&
        !ref.read(outputProvider).isLoadingHistory) {
      ref.read(outputProvider.notifier).loadMoreHistory();
    }
  }

  void _scrollToBottom({bool force = false}) {
    if (!_scrollController.hasClients) return;
    if (!force && _userScrolledUp) return;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
        if (force) {
          setState(() {
            _userScrolledUp = false;
          });
        }
      }
    });
  }

  List<String> _splitLines(String content) {
    if (content.isEmpty) return [''];
    return content.split('\n');
  }

  List<TextSpan> _getLineSpans(int index, String line, TextStyle baseStyle) {
    // Invalidate cache if content changed
    if (_lastContent != ref.read(outputProvider).content) {
      _lineCache.clear();
      _lastContent = ref.read(outputProvider).content;
    }

    return _lineCache.putIfAbsent(
      index,
      () => AnsiParser.parseLine(line, baseStyle),
    );
  }

  @override
  Widget build(BuildContext context) {
    final outputState = ref.watch(outputProvider);
    final lines = _splitLines(outputState.content);

    // Auto-scroll when content updates and user is at bottom
    if (!_userScrolledUp && outputState.content.isNotEmpty) {
      _scrollToBottom();
    }

    final fontSize = AppConfig.fontSizeLarge;
    final baseStyle = GoogleFonts.ubuntuMono(
      fontSize: fontSize,
      color: AppTheme.terminalText,
      height: AppConfig.lineHeightRatio,
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        // Report container size for terminal resize
        ref.read(terminalResizeProvider.notifier).onContainerResize(
              constraints.maxWidth,
              constraints.maxHeight,
              fontSize,
            );

        return Container(
          color: AppTheme.terminalBackground,
          child: Stack(
            children: [
              ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(AppConfig.terminalPadding),
                itemCount: lines.length,
                itemBuilder: (context, index) {
                  final spans = _getLineSpans(index, lines[index], baseStyle);
                  return Text.rich(
                    TextSpan(children: spans),
                    softWrap: true,
                  );
                },
              ),
              // Loading indicator when fetching history
              if (outputState.isLoadingHistory)
                const Positioned(
                  top: 8,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  ),
                ),
              // "Scroll to bottom" button when user has scrolled up
              if (_userScrolledUp)
                Positioned(
                  bottom: 8,
                  right: 8,
                  child: FloatingActionButton.small(
                    onPressed: () => _scrollToBottom(force: true),
                    child: const Icon(Icons.arrow_downward),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_config.dart';
import '../../config/theme.dart';
import '../../providers/output_provider.dart';
import '../../providers/terminal_resize_provider.dart';
import '../../providers/websocket_provider.dart';
import '../../utils/ansi_parser.dart';

/// Debug log shared with CommandInputArea's TextField.
final debugLogProvider = StateProvider<String>((ref) => '');

/// Global debug log — accessible from other files for logging.
final List<String> globalDebugLog = [];
Stopwatch? globalDebugSw;

/// Callback set by the widget to push log updates to the UI.
void Function()? _onDebugLogAdded;

/// Append a debug log entry from outside the widget.
void addDebugLog(String msg) {
  globalDebugSw ??= Stopwatch()..start();
  final t = globalDebugSw!.elapsedMilliseconds;
  globalDebugLog.add('${t}ms $msg');
  if (globalDebugLog.length > 10000) globalDebugLog.removeAt(0);
  _onDebugLogAdded?.call();
}

class TerminalOutput extends ConsumerStatefulWidget {
  const TerminalOutput({super.key});

  @override
  ConsumerState<TerminalOutput> createState() => _TerminalOutputState();
}

class _TerminalOutputState extends ConsumerState<TerminalOutput> {
  final ScrollController _scrollController = ScrollController();

  // ─── Flags matching web refs ──────────────────────────────

  /// Web: userScrolledUpRef — synchronous intent tracker.
  /// true = user has explicitly scrolled away from the bottom.
  bool _userScrolledUp = false; // #1

  /// Web: lastScrollHeightRef — for detecting content-change-induced
  /// scroll events vs real user scrolls.  (#2 / #21)
  double _lastMaxScrollExtent = 0;

  /// Web: lastScrollTopRef — previous scroll position for direction detection. (#6)
  double _previousPixels = 0;

  /// Flutter-specific: pointer is currently down on the terminal. (#18)
  bool _userIsTouching = false;

  /// Flutter-specific: a user-initiated scroll (including fling) is
  /// in progress. Covers the gap between finger-up and fling-end
  /// where _userIsTouching is false but the user is still scrolling. (#19)
  bool _userScrollInProgress = false;

  /// Flutter-specific: we are inside a programmatic jumpTo.  (#20)
  bool _isAutoScrolling = false;

  // ─── Caches ───────────────────────────────────────────────

  final Map<int, List<TextSpan>> _lineCache = {};
  String _lastContent = '';

  /// For resize: only call provider when constraints change. (#27)
  double _lastConstraintW = 0;
  double _lastConstraintH = 0;

  /// Web: isTargetSwitchingRef — prevents history loading during target change.
  bool _isTargetSwitching = false;

  /// Tracks the last-seen target to detect changes within build().
  /// Web: useEffect([selectedTarget]) resets all flags.
  String? _lastTarget;

  // ─── Debug log ─────────────────────────────────────────────
  final List<String> _debugLog = [];
  final Stopwatch _debugSw = Stopwatch()..start();
  int _dbgPrevLines = -1;
  bool _dbgPushScheduled = false;

  void _dbgLog(String tag, {double? px, double? max, int? lines}) {
    globalDebugSw ??= _debugSw;
    final t = _debugSw.elapsedMilliseconds;
    final p = px != null ? ' px=${px.toStringAsFixed(0)}' : '';
    final m = max != null ? ' mx=${max.toStringAsFixed(0)}' : '';
    final d = (px != null && max != null)
        ? ' d=${(max - px).toStringAsFixed(0)}'
        : '';
    final l = lines != null ? ' ln=$lines' : '';
    final entry = '${t}ms $tag$p$m$d$l';
    _debugLog.add(entry);
    globalDebugLog.add(entry);
    if (_debugLog.length > 10000) _debugLog.removeAt(0);
    if (globalDebugLog.length > 10000) globalDebugLog.removeAt(0);
    _scheduleLogPush();
  }

  /// Throttled push of globalDebugLog → debugLogProvider (once per frame).
  /// Called from both _dbgLog (widget-internal) and addDebugLog (external).
  void _scheduleLogPush() {
    if (!_dbgPushScheduled) {
      _dbgPushScheduled = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _dbgPushScheduled = false;
        if (mounted) {
          ref.read(debugLogProvider.notifier).state =
              globalDebugLog.join('\n');
        }
      });
    }
  }

  // ─── Lifecycle ────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    // Register callback so addDebugLog() from external files (e.g.
    // terminal_resize_provider) also triggers UI updates.
    _onDebugLogAdded = _scheduleLogPush;
  }

  @override
  void dispose() {
    _onDebugLogAdded = null;
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  // ─── #8  checkIfAtBottom ──────────────────────────────────
  /// Web: checkIfAtBottom(element)
  /// scrollHeight - scrollTop - clientHeight < BOTTOM_THRESHOLD
  bool _checkIfAtBottom() {
    if (!_scrollController.hasClients) return true;
    final pos = _scrollController.position;
    return (pos.maxScrollExtent - pos.pixels) < AppConfig.bottomThreshold;
  }

  // ─── #10  handleScroll  (= _onScroll) ────────────────────
  /// Port of useScrollBasedOutput.handleScroll.
  /// Key addition: content-change detection via _lastMaxScrollExtent.
  void _onScroll() {
    // #20: skip scroll events from our own jumpTo
    if (_isAutoScrolling) return;
    if (!_scrollController.hasClients) return;

    final position = _scrollController.position;

    // ── #2/#21: detect content change ──
    final isContentChange =
        (position.maxScrollExtent - _lastMaxScrollExtent).abs() > 0.5;
    _lastMaxScrollExtent = position.maxScrollExtent;

    // In Flutter, content-change scroll events are NOT user-initiated,
    // so we SKIP intent tracking for them.
    if (isContentChange) return;

    // ── #8: atBottom check ──
    final atBottom = _checkIfAtBottom();

    // ── #6: direction detection ──
    _previousPixels = position.pixels;

    // ── #1: intent tracking ──
    final wasAtBottom = !_userScrolledUp;
    if (atBottom != wasAtBottom) {
      _userScrolledUp = !atBottom;

      // #15: tell the output notifier (sync flag).
      ref.read(outputProvider.notifier).setScrollPosition(atBottom);

      // #14: handleScrollPositionChange → refresh rate
      ref.read(websocketServiceProvider).setRefreshRate(
            atBottom
                ? AppConfig.refreshIntervalFast
                : AppConfig.refreshIntervalNormal,
          );

      // Trigger rebuild for FAB visibility.
      setState(() {});
    }
  }

  // ─── #9  scrollToBottom ───────────────────────────────────
  void _scrollToBottom({bool force = false}) {
    if (!_scrollController.hasClients) return;

    if (!force &&
        (_userScrolledUp || _userIsTouching || _userScrollInProgress)) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      if (!force &&
          (_userScrolledUp || _userIsTouching || _userScrollInProgress)) {
        return;
      }

      _isAutoScrolling = true;
      _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      _lastMaxScrollExtent = _scrollController.position.maxScrollExtent;
      _isAutoScrolling = false;

      if (force) {
        _userScrolledUp = false;
        ref.read(outputProvider.notifier).setScrollPosition(true);
        ref
            .read(websocketServiceProvider)
            .setRefreshRate(AppConfig.refreshIntervalFast);
        setState(() {});
      }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────

  List<String> _splitLines(String content) {
    if (content.isEmpty) return [''];
    return content.split('\n');
  }

  List<TextSpan> _getLineSpans(int index, String line, TextStyle baseStyle) {
    final currentContent = ref.read(outputProvider).content;
    if (_lastContent != currentContent) {
      _lineCache.clear();
      _lastContent = currentContent;
    }
    return _lineCache.putIfAbsent(
      index,
      () => AnsiParser.parseLine(line, baseStyle),
    );
  }

  // ─── #19  _handleScrollNotification ───────────────────────
  /// Detect user scroll lifecycle (drag start → fling end).
  bool _handleScrollNotification(ScrollNotification notification) {
    if (notification is ScrollStartNotification) {
      if (notification.dragDetails != null) {
        _userScrollInProgress = true;
      }
    } else if (notification is ScrollEndNotification) {
      _userScrollInProgress = false;
    }
    return false;
  }

  // ─── Target change detection ─────────────────────────────
  void _resetForTargetChange() {
    _userScrolledUp = false;
    _userIsTouching = false;
    _userScrollInProgress = false;
    _isAutoScrolling = false;
    _lastMaxScrollExtent = 0;
    _previousPixels = 0;
    _lineCache.clear();
    _lastContent = '';
    _isTargetSwitching = true;
    // Reset cached constraints so LayoutBuilder re-sends resize for new target.
    _lastConstraintW = 0;
    _lastConstraintH = 0;

    ref.read(outputProvider.notifier).setScrollPosition(true);
    ref
        .read(websocketServiceProvider)
        .setRefreshRate(AppConfig.refreshIntervalFast);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _isTargetSwitching = false;
      _scrollToBottom(force: true);
    });
  }

  // ─── Build ────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final outputState = ref.watch(outputProvider);
    final currentTarget = ref.watch(selectedTargetProvider);
    if (_lastTarget != null && _lastTarget != currentTarget) {
      _resetForTargetChange();
    }
    _lastTarget = currentTarget;

    final lines = _splitLines(outputState.content);

    // Debug: log build with line count changes
    if (lines.length != _dbgPrevLines) {
      _dbgLog('BLD', lines: lines.length);
      _dbgPrevLines = lines.length;
    }

    // Auto-scroll when at bottom
    if (!_userScrolledUp &&
        !_userIsTouching &&
        !_userScrollInProgress &&
        outputState.content.isNotEmpty) {
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
        // #27: only call resize when constraints actually change.
        if (constraints.maxWidth != _lastConstraintW ||
            constraints.maxHeight != _lastConstraintH) {
          _dbgLog('LB ${constraints.maxWidth.toStringAsFixed(0)}x${constraints.maxHeight.toStringAsFixed(0)}');
          _lastConstraintW = constraints.maxWidth;
          _lastConstraintH = constraints.maxHeight;
          ref.read(terminalResizeProvider.notifier).onContainerResize(
                constraints.maxWidth,
                constraints.maxHeight,
                fontSize,
              );
        }

        return Stack(
          children: [
            // #18: Listener for instant touch detection.
            Listener(
              onPointerDown: (_) => _userIsTouching = true,
              onPointerUp: (_) => _userIsTouching = false,
              onPointerCancel: (_) => _userIsTouching = false,
              // #19: NotificationListener for fling lifecycle.
              child: NotificationListener<ScrollNotification>(
                onNotification: _handleScrollNotification,
                child: Container(
                  margin: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.terminalBackground,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: ListView.builder(
                    controller: _scrollController,
                    // Allow scrolling even when content fits viewport.
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(AppConfig.terminalPadding),
                    itemCount: lines.length,
                    itemBuilder: (context, index) {
                      final spans =
                          _getLineSpans(index, lines[index], baseStyle);
                      return Text.rich(
                        TextSpan(children: spans),
                        softWrap: true,
                      );
                    },
                  ),
                ),
              ),
            ),
            // Loading indicator
            if (outputState.isLoadingHistory)
              const Positioned(
                top: 16,
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
            // Scroll-to-bottom FAB
            if (_userScrolledUp)
              Positioned(
                bottom: 24,
                right: 24,
                child: FloatingActionButton.small(
                  onPressed: () => _scrollToBottom(force: true),
                  child: const Icon(Icons.arrow_downward),
                ),
              ),
          ],
        );
      },
    );
  }
}

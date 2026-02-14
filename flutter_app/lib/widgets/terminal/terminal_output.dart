import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../config/app_config.dart';
import '../../config/theme.dart';
import '../../providers/output_provider.dart';
import '../../providers/terminal_resize_provider.dart';
import '../../providers/websocket_provider.dart';
import '../../utils/ansi_parser.dart';

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

  /// For history-load scroll preservation. (#5)
  int _previousLineCount = 0;

  /// Web: isTargetSwitchingRef — prevents history loading during target change.
  bool _isTargetSwitching = false;

  /// Tracks the last-seen target to detect changes within build().
  /// Web: useEffect([selectedTarget]) resets all flags.
  String? _lastTarget;

  // ─── Lifecycle ────────────────────────────────────────────

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
    // Web: const scrollHeightDiff = Math.abs(
    //         element.scrollHeight - lastScrollHeightRef.current);
    //       const isContentChange = scrollHeightDiff > 100;
    //       lastScrollHeightRef.current = element.scrollHeight;
    final isContentChange =
        (position.maxScrollExtent - _lastMaxScrollExtent).abs() > 0.5;
    _lastMaxScrollExtent = position.maxScrollExtent;

    // Web: "Always track scroll position intent, even during
    //        content changes" — but in Flutter, content-change
    //        scroll events are NOT user-initiated, so we SKIP
    //        intent tracking for them.  (This is the key fix.)
    if (isContentChange) return;

    // ── #8: atBottom check ──
    final atBottom = _checkIfAtBottom();

    // ── #6: direction detection ──
    final isScrollingUp = position.pixels < _previousPixels;
    _previousPixels = position.pixels;

    // ── #1: intent tracking ──
    // Web: if (atBottom !== wasAtBottom) { ... }
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

    // ── #10 cont: history loading ──
    // Web: if (isScrollingUp && element.scrollTop < SCROLL_THRESHOLD
    //         && !isLoadingRef.current && !isTargetSwitchingRef.current)
    if (isScrollingUp &&
        position.pixels < AppConfig.scrollThreshold &&
        !ref.read(outputProvider).isLoadingHistory &&
        !_isTargetSwitching) {
      ref.read(outputProvider.notifier).loadMoreHistory();
    }
  }

  // ─── #9  scrollToBottom ───────────────────────────────────
  /// Port of useScrollBasedOutput.scrollToBottom.
  /// force=true: explicit user action (FAB tap, target switch).
  /// force=false: auto-update when new content arrives.
  void _scrollToBottom({bool force = false}) {
    if (!_scrollController.hasClients) return;

    // Web: if (!force && userScrolledUpRef.current) return;
    // Flutter adds: _userIsTouching, _userScrollInProgress
    if (!force &&
        (_userScrolledUp || _userIsTouching || _userScrollInProgress)) {
      return;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scrollController.hasClients) return;
      // Re-check at execution time (user may have started scrolling
      // between scheduling and now).
      if (!force &&
          (_userScrolledUp || _userIsTouching || _userScrollInProgress)) {
        return;
      }

      _isAutoScrolling = true;
      _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      // Update _lastMaxScrollExtent so the next _onScroll doesn't
      // see the jumpTo as a content change.
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
  /// Detect user scroll lifecycle (drag start → fling end) via
  /// the Flutter notification system.
  bool _handleScrollNotification(ScrollNotification notification) {
    if (notification is ScrollStartNotification) {
      // dragDetails != null ⇒ user's finger initiated the scroll.
      // null ⇒ programmatic or ballistic (fling continuation).
      if (notification.dragDetails != null) {
        _userScrollInProgress = true;
      }
    } else if (notification is ScrollEndNotification) {
      // All motion stopped (including fling).
      _userScrollInProgress = false;
    }
    return false; // Don't absorb — let child widgets still see it.
  }

  // ─── Build ────────────────────────────────────────────────

  // ─── Target change detection ─────────────────────────────
  /// Port of useScrollBasedOutput useEffect([selectedTarget]).
  /// Resets all scroll flags and forces scroll to bottom when
  /// the user switches to a different tmux target.
  void _resetForTargetChange() {
    _userScrolledUp = false;
    _userIsTouching = false;
    _userScrollInProgress = false;
    _isAutoScrolling = false;
    _lastMaxScrollExtent = 0;
    _previousPixels = 0;
    _previousLineCount = 0;
    _lineCache.clear();
    _lastContent = '';
    _isTargetSwitching = true;

    // Tell the provider we're at bottom.
    ref.read(outputProvider.notifier).setScrollPosition(true);
    ref
        .read(websocketServiceProvider)
        .setRefreshRate(AppConfig.refreshIntervalFast);

    // Web: requestAnimationFrame(() => { isTargetSwitchingRef.current = false; });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _isTargetSwitching = false;
      // Web: needsScrollToBottomRef — scroll to bottom once DOM settles.
      _scrollToBottom(force: true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final outputState = ref.watch(outputProvider);
    // Watch the selected target to detect changes.
    final currentTarget = ref.watch(selectedTargetProvider);
    if (_lastTarget != null && _lastTarget != currentTarget) {
      _resetForTargetChange();
    }
    _lastTarget = currentTarget;

    final lines = _splitLines(outputState.content);

    // ── #5 / #11: history-load scroll preservation ──
    // Detect: line count increased while user is scrolled up and
    // not currently loading (i.e. load just completed).
    final isHistoryLoad = lines.length > _previousLineCount &&
        _previousLineCount > 0 &&
        !outputState.isLoadingHistory &&
        _userScrolledUp;

    if (isHistoryLoad) {
      final addedLines = lines.length - _previousLineCount;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scrollController.hasClients && addedLines > 0) {
          final fontSize = AppConfig.fontSizeLarge;
          final lineHeight = fontSize * AppConfig.lineHeightRatio;
          _isAutoScrolling = true;
          _scrollController
              .jumpTo(_scrollController.offset + addedLines * lineHeight);
          _lastMaxScrollExtent = _scrollController.position.maxScrollExtent;
          _isAutoScrolling = false;
        }
      });
    } else if (!_userScrolledUp &&
        !_userIsTouching &&
        !_userScrollInProgress &&
        outputState.content.isNotEmpty) {
      // #15: auto-scroll when at bottom
      // Web: shouldAutoUpdate = !hasUserScrolledUp() || checkIsAtBottom()
      //      if (shouldAutoUpdate) { setOutput(output); scrollToBottom(); }
      _scrollToBottom();
    }
    _previousLineCount = lines.length;

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

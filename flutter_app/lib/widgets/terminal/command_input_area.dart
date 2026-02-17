import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_config.dart';
import '../../providers/command_provider.dart';
import '../../providers/websocket_provider.dart';
import 'terminal_output.dart' show debugLogProvider;

class CommandInputArea extends ConsumerStatefulWidget {
  const CommandInputArea({super.key});

  @override
  ConsumerState<CommandInputArea> createState() => _CommandInputAreaState();
}

class _CommandInputAreaState extends ConsumerState<CommandInputArea> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  bool _expanded = false;
  bool _hasText = false;
  String _lastLogText = '';

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final hasText = _controller.text.trim().isNotEmpty;
      if (hasText != _hasText) {
        setState(() => _hasText = hasText);
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _sendCommand() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    ref.read(commandProvider.notifier).sendCommand(text);
    _controller.clear();
  }

  void _sendEnter() {
    ref.read(commandProvider.notifier).sendEnter();
  }

  @override
  Widget build(BuildContext context) {
    final cmdState = ref.watch(commandProvider);
    final isConnected = ref.watch(wsIsConnectedProvider);
    final enabled = isConnected && !cmdState.isLoading;

    // Debug: update TextField with log (only when new content arrives)
    ref.listen<String>(debugLogProvider, (_, next) {
      if (next != _lastLogText) {
        _lastLogText = next;
        _controller.text = next;
        _controller.selection =
            TextSelection.collapsed(offset: next.length);
        // Auto-scroll to bottom of log
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_scrollController.hasClients) {
            _scrollController
                .jumpTo(_scrollController.position.maxScrollExtent);
          }
        });
      }
    });

    const btnShape = RoundedRectangleBorder(
      borderRadius: BorderRadius.all(Radius.circular(8)),
    );

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row 1: Action buttons (matches web: Send+Enter left, Del+Clear right)
          Row(
            children: [
              // Left group
              FilledButton.icon(
                onPressed: enabled && _hasText ? _sendCommand : null,
                icon: cmdState.isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send, size: 16),
                label: const Text('送信'),
                style: FilledButton.styleFrom(shape: btnShape),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: enabled ? _sendEnter : null,
                style: OutlinedButton.styleFrom(shape: btnShape),
                child: const Text('Enter'),
              ),
              const Spacer(),
              // Right group
              OutlinedButton(
                onPressed: enabled
                    ? () => ref
                        .read(commandProvider.notifier)
                        .sendSpecialKey('\x7f')
                    : null,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  shape: btnShape,
                ),
                child: const Text('Del'),
              ),
              const SizedBox(width: 4),
              OutlinedButton(
                onPressed: enabled
                    ? () => ref
                        .read(commandProvider.notifier)
                        .sendSpecialKey('\x0c')
                    : null,
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  foregroundColor: Colors.orange,
                  shape: btnShape,
                ),
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          // Row 2: TextField + expand/arrow buttons (matches web layout)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  scrollController: _scrollController,
                  focusNode: _focusNode,
                  enabled: enabled,
                  readOnly: false,
                  maxLines: _expanded ? 20 : 3,
                  minLines: _expanded ? 20 : 3,
                  decoration: const InputDecoration(
                    hintText: 'Enter message',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(Radius.circular(4)),
                    ),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    isDense: true,
                  ),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontFamily: 'monospace',
                        fontSize: 14,
                      ),
                  textInputAction: TextInputAction.newline,
                ),
              ),
              const SizedBox(width: 4),
              // Vertical button stack (expand, up, down)
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _SmallIconButton(
                    icon: _expanded
                        ? Icons.fullscreen_exit
                        : Icons.fullscreen,
                    onPressed: () => setState(() => _expanded = !_expanded),
                    tooltip: _expanded ? 'コマンド欄を縮小' : 'コマンド欄を拡大',
                  ),
                  _SmallIconButton(
                    icon: Icons.keyboard_arrow_up,
                    onPressed: enabled
                        ? () => ref
                            .read(commandProvider.notifier)
                            .sendSpecialKey('\x1b[A')
                        : null,
                    tooltip: '↑',
                  ),
                  _SmallIconButton(
                    icon: Icons.keyboard_arrow_down,
                    onPressed: enabled
                        ? () => ref
                            .read(commandProvider.notifier)
                            .sendSpecialKey('\x1b[B')
                        : null,
                    tooltip: '↓',
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SmallIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onPressed;
  final String? tooltip;

  const _SmallIconButton({
    required this.icon,
    this.onPressed,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 32,
      height: 28,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          padding: EdgeInsets.zero,
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
          ),
        ),
        child: Icon(icon, size: 18),
      ),
    );
  }
}

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
  String _lastLogText = '';

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

    return Container(
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row 1: Action buttons (matches web: Send+Enter left, Del+Clear right)
          Row(
            children: [
              // Left group
              FilledButton.icon(
                onPressed: enabled ? _sendCommand : null,
                icon: cmdState.isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send, size: 16),
                label: const Text('送信'),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: enabled ? _sendEnter : null,
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
                    padding: const EdgeInsets.symmetric(horizontal: 8)),
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
                ),
                child: const Text('Clear'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // Row 2: TextField + expand/arrow buttons (matches web layout)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  scrollController: _scrollController,
                  focusNode: _focusNode,
                  readOnly: false,
                  maxLines: _expanded ? 20 : 8,
                  minLines: _expanded ? 20 : 8,
                  decoration: const InputDecoration(
                    hintText: 'Enter message',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                    icon: _expanded ? Icons.expand_less : Icons.expand_more,
                    onPressed: () => setState(() => _expanded = !_expanded),
                    tooltip: _expanded ? 'コマンド欄を縮小' : 'コマンド欄を拡大',
                  ),
                  _SmallIconButton(
                    icon: Icons.arrow_upward,
                    onPressed: enabled
                        ? () => ref
                            .read(commandProvider.notifier)
                            .sendSpecialKey('\x1b[A')
                        : null,
                    tooltip: '↑',
                  ),
                  _SmallIconButton(
                    icon: Icons.arrow_downward,
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
    return IconButton(
      icon: Icon(icon, size: 20),
      onPressed: onPressed,
      tooltip: tooltip,
      constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
      padding: EdgeInsets.zero,
      iconSize: 20,
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_config.dart';
import '../../providers/command_provider.dart';
import '../../providers/websocket_provider.dart';

class CommandInputArea extends ConsumerStatefulWidget {
  const CommandInputArea({super.key});

  @override
  ConsumerState<CommandInputArea> createState() => _CommandInputAreaState();
}

class _CommandInputAreaState extends ConsumerState<CommandInputArea> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  bool _expanded = false;

  @override
  void dispose() {
    _controller.dispose();
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

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          top: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  focusNode: _focusNode,
                  enabled: isConnected && !cmdState.isLoading,
                  maxLines: _expanded ? 8 : AppConfig.commandInputMinLines,
                  minLines: _expanded ? 8 : AppConfig.commandInputMinLines,
                  decoration: const InputDecoration(
                    hintText: 'ls -la',
                    border: OutlineInputBorder(),
                    contentPadding:
                        EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    isDense: true,
                  ),
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontFamily: 'monospace',
                      ),
                  textInputAction: TextInputAction.newline,
                ),
              ),
              const SizedBox(width: 4),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(
                        _expanded ? Icons.expand_less : Icons.expand_more),
                    onPressed: () => setState(() => _expanded = !_expanded),
                    tooltip: _expanded ? 'コマンド欄を縮小' : 'コマンド欄を拡大',
                    iconSize: 20,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  onPressed:
                      isConnected && !cmdState.isLoading ? _sendCommand : null,
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
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: isConnected && !cmdState.isLoading
                    ? _sendEnter
                    : null,
                child: const Text('Enter'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

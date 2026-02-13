import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/command_provider.dart';
import '../../providers/websocket_provider.dart';

class _KeyDef {
  final String command;
  final String label;
  final String description;

  const _KeyDef(this.command, this.label, this.description);
}

const _keys = [
  _KeyDef('\x0c', 'Clear', '画面をクリア'),
  _KeyDef('\x1b', 'ESC', 'ESCキーを送信'),
  _KeyDef('\x03', 'Ctrl+C', 'プロセス終了'),
  _KeyDef('\x0f', 'Ctrl+O', '履歴展開'),
  _KeyDef('\x7f', 'Del', 'Backspaceキーを送信'),
  _KeyDef('\x1b[A', '↑', '上矢印キー'),
  _KeyDef('\x1b[B', '↓', '下矢印キー'),
  _KeyDef('\x1b[Z', '⇧+Tab', '前方移動'),
];

class TmuxKeyboard extends ConsumerWidget {
  const TmuxKeyboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isConnected = ref.watch(wsIsConnectedProvider);
    final cmdState = ref.watch(commandProvider);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: _keys.map((key) {
          return Tooltip(
            message: key.description,
            child: OutlinedButton(
              onPressed: isConnected && !cmdState.isLoading
                  ? () => ref
                      .read(commandProvider.notifier)
                      .sendSpecialKey(key.command)
                  : null,
              style: OutlinedButton.styleFrom(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                minimumSize: const Size(0, 32),
                textStyle: const TextStyle(fontSize: 12),
              ),
              child: Text(key.label),
            ),
          );
        }).toList(),
      ),
    );
  }
}

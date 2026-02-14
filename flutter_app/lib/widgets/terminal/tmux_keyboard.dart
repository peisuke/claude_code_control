import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/keyboard_constants.dart';
import '../../providers/command_provider.dart';
import '../../providers/websocket_provider.dart';

/// Mobile-only tmux keyboard shortcuts (matches web: 4 buttons only).
/// Ctrl+O, ⇧+Tab on left | ESC, Ctrl+C on right.
class TmuxKeyboard extends ConsumerWidget {
  const TmuxKeyboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isConnected = ref.watch(wsIsConnectedProvider);
    final cmdState = ref.watch(commandProvider);
    final enabled = isConnected && !cmdState.isLoading;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left group
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: enabled
                    ? () => ref
                        .read(commandProvider.notifier)
                        .sendSpecialKey(KeyboardCommands.ctrlO)
                    : null,
                icon: const Icon(Icons.search, size: 16),
                label: Text(keyboardLabels[KeyboardCommands.ctrlO]!),
                style: _buttonStyle,
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: enabled
                    ? () => ref
                        .read(commandProvider.notifier)
                        .sendSpecialKey(KeyboardCommands.shiftTab)
                    : null,
                icon: Transform.rotate(
                  angle: 3.14159,
                  child: const Icon(Icons.keyboard_tab, size: 16),
                ),
                label: Text(keyboardLabels[KeyboardCommands.shiftTab]!),
                style: _buttonStyle,
              ),
            ],
          ),
          // Right group
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: enabled
                    ? () => ref
                        .read(commandProvider.notifier)
                        .sendSpecialKey(KeyboardCommands.escape)
                    : null,
                icon: const Icon(Icons.exit_to_app, size: 16),
                label: Text(keyboardLabels[KeyboardCommands.escape]!),
                style: _buttonStyle,
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: enabled
                    ? () => ref
                        .read(commandProvider.notifier)
                        .sendSpecialKey(KeyboardCommands.ctrlC)
                    : null,
                icon: const Icon(Icons.clear_all, size: 16),
                label: Text(keyboardLabels[KeyboardCommands.ctrlC]!),
                style: _buttonStyle,
              ),
            ],
          ),
        ],
      ),
    );
  }

  static final _buttonStyle = OutlinedButton.styleFrom(
    padding: const EdgeInsets.symmetric(horizontal: 8),
    minimumSize: const Size(0, 36),
    textStyle: const TextStyle(fontSize: 12),
  );
}

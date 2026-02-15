import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/command_provider.dart';
import '../../providers/output_provider.dart';
import '../../providers/websocket_provider.dart';
import '../../utils/choice_detector.dart';

class ChoiceButtons extends ConsumerWidget {
  const ChoiceButtons({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final outputState = ref.watch(outputProvider);
    final isConnected = ref.watch(wsIsConnectedProvider);
    final choices = ChoiceDetector.detect(outputState.content);

    if (choices.isEmpty) return const SizedBox.shrink();

    // Web: vertical Stack with spacing=1 (8px), buttons flex equally,
    // outlined style, left-aligned text, min 44px height.
    return Container(
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: choices.map((choice) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: SizedBox(
              width: double.infinity,
              height: 44,
              child: OutlinedButton(
                onPressed: isConnected
                    ? () async {
                        final notifier = ref.read(commandProvider.notifier);
                        await notifier
                            .sendCommand(choice.number.toString());
                        await notifier.sendEnter();
                      }
                    : null,
                style: OutlinedButton.styleFrom(
                  alignment: Alignment.centerLeft,
                ),
                child: Text(
                  '${choice.number}. ${choice.text}',
                  overflow: TextOverflow.ellipsis,
                  maxLines: 1,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

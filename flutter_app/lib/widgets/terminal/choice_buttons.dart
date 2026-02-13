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

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      child: Row(
        children: choices.map((choice) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: FilledButton.tonal(
                onPressed: isConnected
                    ? () async {
                        final notifier = ref.read(commandProvider.notifier);
                        await notifier
                            .sendCommand(choice.number.toString());
                        await notifier.sendEnter();
                      }
                    : null,
                child: Text(
                  '${choice.number}. ${choice.text}',
                  textAlign: TextAlign.center,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

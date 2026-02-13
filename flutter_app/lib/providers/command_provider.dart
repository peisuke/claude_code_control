import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';
import 'output_provider.dart';

class CommandState {
  final bool isLoading;
  final String? error;

  const CommandState({this.isLoading = false, this.error});

  CommandState copyWith({bool? isLoading, String? error}) {
    return CommandState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

final commandProvider =
    StateNotifierProvider<CommandNotifier, CommandState>((ref) {
  final api = ref.watch(apiServiceProvider);
  final target = ref.watch(selectedTargetProvider);
  final outputNotifier = ref.read(outputProvider.notifier);
  return CommandNotifier(api, target, outputNotifier);
});

class CommandNotifier extends StateNotifier<CommandState> {
  final ApiService _api;
  final String _target;
  final OutputNotifier _outputNotifier;

  CommandNotifier(this._api, this._target, this._outputNotifier)
      : super(const CommandState());

  Future<void> sendCommand(String command) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _api.sendCommand(command, target: _target);
      await Future.delayed(
          const Duration(milliseconds: AppConfig.commandRefreshDelayMs));
      await _outputNotifier.refresh();
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> sendEnter() async {
    try {
      await _api.sendEnter(target: _target);
      await Future.delayed(
          const Duration(milliseconds: AppConfig.commandRefreshDelayMs));
      await _outputNotifier.refresh();
    } catch (_) {
      // ignore
    }
  }

  Future<void> sendSpecialKey(String key) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await _api.sendCommand(key, target: _target);
      await Future.delayed(
          const Duration(milliseconds: AppConfig.commandRefreshDelayMs));
      await _outputNotifier.refresh();
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/tmux_session.dart';
import '../services/api_service.dart';
import 'connection_provider.dart';

class SessionState {
  final TmuxHierarchy? hierarchy;
  final bool isLoading;
  final String? error;

  const SessionState({this.hierarchy, this.isLoading = false, this.error});

  SessionState copyWith({
    TmuxHierarchy? hierarchy,
    bool? isLoading,
    String? error,
  }) {
    return SessionState(
      hierarchy: hierarchy ?? this.hierarchy,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

final sessionProvider =
    StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  final api = ref.watch(apiServiceProvider);
  return SessionNotifier(api);
});

class SessionNotifier extends StateNotifier<SessionState> {
  final ApiService _api;

  SessionNotifier(this._api) : super(const SessionState()) {
    fetchHierarchy();
  }

  Future<void> fetchHierarchy() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _api.getHierarchy();
      if (response.success && response.data != null) {
        state = state.copyWith(hierarchy: response.data, isLoading: false);
      } else {
        state = state.copyWith(
            isLoading: false, error: response.message);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> createSession(String name) async {
    try {
      final response = await _api.createSession(name);
      if (response.success) {
        await fetchHierarchy();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteSession(String name) async {
    try {
      final response = await _api.deleteSession(name);
      if (response.success) {
        await fetchHierarchy();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> createWindow(String sessionName, {String? windowName}) async {
    try {
      final response =
          await _api.createWindow(sessionName, windowName: windowName);
      if (response.success) {
        await fetchHierarchy();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  Future<bool> deleteWindow(String sessionName, String windowIndex) async {
    try {
      final response = await _api.deleteWindow(sessionName, windowIndex);
      if (response.success) {
        await fetchHierarchy();
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }
}

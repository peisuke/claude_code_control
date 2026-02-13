import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';

enum ViewMode { tmux, file }

final viewProvider =
    StateNotifierProvider<ViewNotifier, ViewMode>((ref) {
  return ViewNotifier();
});

class ViewNotifier extends StateNotifier<ViewMode> {
  ViewNotifier() : super(ViewMode.tmux) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final mode = prefs.getString(AppConfig.keyViewMode);
    if (mode == 'file') {
      state = ViewMode.file;
    }
  }

  Future<void> setMode(ViewMode mode) async {
    state = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        AppConfig.keyViewMode, mode == ViewMode.file ? 'file' : 'tmux');
  }
}

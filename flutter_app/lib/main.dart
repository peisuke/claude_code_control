import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app.dart';
import 'config/app_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load saved backend URL before any provider is created.
  // This ensures the first HTTP health check uses the correct URL.
  final prefs = await SharedPreferences.getInstance();
  AppConfig.setSavedBackendUrl(prefs.getString(AppConfig.keyBackendUrl));

  runApp(
    const ProviderScope(
      child: TmuxControlApp(),
    ),
  );
}

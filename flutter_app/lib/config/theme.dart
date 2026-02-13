import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  static const Color terminalBackground = Color(0xFF000000);
  static const Color terminalText = Color(0xFFF0F0F0);

  static TextStyle get monoStyle => GoogleFonts.ubuntuMono(
        fontSize: 14.0,
        color: terminalText,
        height: 1.2,
      );

  static ThemeData lightTheme() {
    return ThemeData(
      useMaterial3: true,
      colorSchemeSeed: Colors.blue,
      brightness: Brightness.light,
    );
  }

  static ThemeData darkTheme() {
    return ThemeData(
      useMaterial3: true,
      colorSchemeSeed: Colors.blue,
      brightness: Brightness.dark,
    );
  }
}

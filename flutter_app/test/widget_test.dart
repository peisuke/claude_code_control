import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:tmux_control/app.dart';

void main() {
  testWidgets('App renders without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: TmuxControlApp()),
    );
    // Verify the app title appears
    expect(find.text('tmux: default'), findsOneWidget);
  });
}

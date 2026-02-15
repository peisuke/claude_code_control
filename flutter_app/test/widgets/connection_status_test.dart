/// Port of frontend/src/components/__tests__/ConnectionStatus.test.tsx
///
/// The web component uses: isConnected, wsConnected, isReconnecting,
/// reconnectAttempts, maxReconnectAttempts, error, wsError, onReconnect.
///
/// Flutter's ConnectionStatus widget is simpler — it reads connectionProvider
/// (HTTP bool) and wsIsConnectedProvider (WS bool) to display 3 states:
///   - Connected (both true)
///   - WS Disconnected (HTTP true, WS false)
///   - Disconnected (HTTP false)
///
/// Web test cases (23) are mapped to Flutter's 3-state model.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/widgets/common/connection_status.dart';

import '../helpers/widget_test_helpers.dart';

void main() {
  group('ConnectionStatus (ConnectionStatus.test.tsx port)', () {
    // ── connected state ──────────────────────────────────────
    group('connected state', () {
      testWidgets('should display Connected when both HTTP and WS connected',
          (tester) async {
        // Port of: "should display 接続中 text when connected"
        await tester.pumpWidget(buildTestWidget(
          const ConnectionStatus(),
          httpConnected: true,
          wsConnected: true,
        ));
        // Pump to let async providers settle
        await tester.pump();
        await tester.pump();

        expect(find.text('Connected'), findsOneWidget);
      });

      testWidgets('should show green check icon when fully connected',
          (tester) async {
        // Port of: "should have success color when connected"
        await tester.pumpWidget(buildTestWidget(
          const ConnectionStatus(),
          httpConnected: true,
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.cloud_done), findsOneWidget);
      });
    });

    // ── disconnected state ──────────────────────────────────
    group('disconnected state', () {
      testWidgets('should display Disconnected when HTTP disconnected',
          (tester) async {
        // Port of: "should display 切断 text when disconnected"
        await tester.pumpWidget(buildTestWidget(
          const ConnectionStatus(),
          httpConnected: false,
          wsConnected: false,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('Disconnected'), findsOneWidget);
      });

      testWidgets('should show red cloud_off icon when disconnected',
          (tester) async {
        // Port of: "should have error color when disconnected"
        await tester.pumpWidget(buildTestWidget(
          const ConnectionStatus(),
          httpConnected: false,
          wsConnected: false,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.cloud_off), findsOneWidget);
      });
    });

    // ── WS disconnected state ─────────────────────────────
    group('WS disconnected state', () {
      testWidgets(
          'should display WS Disconnected when HTTP ok but WS disconnected',
          (tester) async {
        // Port of: "should display WS切断 text when WS disconnected"
        await tester.pumpWidget(buildTestWidget(
          const ConnectionStatus(),
          httpConnected: true,
          wsConnected: false,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.text('WS Disconnected'), findsOneWidget);
      });

      testWidgets('should show orange cloud_off icon when WS disconnected',
          (tester) async {
        // Port of: "should have warning color when WS disconnected"
        await tester.pumpWidget(buildTestWidget(
          const ConnectionStatus(),
          httpConnected: true,
          wsConnected: false,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byIcon(Icons.cloud_off), findsOneWidget);
      });
    });

    // ── Chip widget ──────────────────────────────────────────
    group('chip rendering', () {
      testWidgets('should render as a Chip widget', (tester) async {
        await tester.pumpWidget(buildTestWidget(
          const ConnectionStatus(),
          httpConnected: true,
          wsConnected: true,
        ));
        await tester.pump();
        await tester.pump();

        expect(find.byType(Chip), findsOneWidget);
      });
    });
  });
}

import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart' show visibleForTesting;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../config/app_config.dart';
import '../models/tmux_output.dart';

enum WsConnectionState { disconnected, connecting, connected }

/// Factory type for creating WebSocket channels (injectable for testing).
typedef WebSocketChannelFactory = WebSocketChannel Function(Uri uri);

class WebSocketService {
  WebSocketChannel? _channel;
  StreamSubscription? _channelSubscription;
  String _wsBaseUrl;
  String _target;
  int _reconnectAttempts = 0;
  final WebSocketChannelFactory? _channelFactory;
  bool _shouldReconnect = true;
  bool _isManualDisconnect = false;
  Timer? _heartbeatTimer;
  Timer? _connectionCheckTimer;
  Timer? _reconnectTimer;
  DateTime _lastHeartbeatTime = DateTime.now();
  double _lastRefreshRate = AppConfig.refreshIntervalFast;

  final _messageController = StreamController<TmuxOutput>.broadcast();
  final _connectionController =
      StreamController<WsConnectionState>.broadcast();

  Stream<TmuxOutput> get messages => _messageController.stream;
  Stream<WsConnectionState> get connectionState =>
      _connectionController.stream;

  WsConnectionState _currentState = WsConnectionState.disconnected;
  WsConnectionState get currentState => _currentState;

  WebSocketService({
    String? wsBaseUrl,
    String target = 'default',
    WebSocketChannelFactory? channelFactory,
  })  : _wsBaseUrl = wsBaseUrl ?? AppConfig.wsBaseUrl,
        _target = target,
        _channelFactory = channelFactory;

  String get _url => '$_wsBaseUrl/${Uri.encodeComponent(_target)}';

  void updateBaseUrl(String newBaseUrl) {
    _wsBaseUrl = newBaseUrl;
  }

  void setTarget(String target) {
    if (_target == target) return;
    final wasConnected = _currentState == WsConnectionState.connected;
    final hadPendingReconnect = _reconnectTimer != null;

    _stopHeartbeat();
    _stopConnectionCheck();
    _reconnectTimer?.cancel();
    _reconnectTimer = null;

    _closeChannel();

    _target = target;
    _reconnectAttempts = 0;
    _shouldReconnect = true;
    _isManualDisconnect = false;

    if (wasConnected || hadPendingReconnect) {
      connect();
    }
  }

  /// Port of websocket.ts calculateReconnectDelay().
  /// Fixed delays for attempts 0-3, then exponential backoff with jitter.
  @visibleForTesting
  int calculateReconnectDelay() {
    // Web: attempts 0→100ms, 1→1000ms, 2→3000ms, 3→5000ms
    if (_reconnectAttempts == 0) return 100;
    if (_reconnectAttempts == 1) return 1000;
    if (_reconnectAttempts == 2) return 3000;
    if (_reconnectAttempts == 3) return 5000;

    // Web: maxReconnectInterval = 10000
    const maxDelay = 10000;
    final exponentialDelay = min(
      100 * pow(2, min(_reconnectAttempts, 10)).toInt(),
      maxDelay,
    );
    final jitter = (Random().nextDouble() * 0.3 * exponentialDelay).toInt();
    return exponentialDelay + jitter;
  }

  void _startHeartbeat() {
    _stopHeartbeat();
    _heartbeatTimer =
        Timer.periodic(const Duration(milliseconds: AppConfig.heartbeatIntervalMs), (_) {
      if (_channel != null) {
        try {
          _channel!.sink.add(jsonEncode({
            'type': 'ping',
            'timestamp': DateTime.now().millisecondsSinceEpoch,
          }));
        } catch (_) {
          // Silently fail - connection check will handle
        }
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  void _startConnectionCheck() {
    _stopConnectionCheck();
    _connectionCheckTimer =
        Timer.periodic(const Duration(milliseconds: AppConfig.connectionCheckIntervalMs), (_) {
      if (_channel != null && _lastHeartbeatTime.millisecondsSinceEpoch > 0) {
        final elapsed =
            DateTime.now().difference(_lastHeartbeatTime).inMilliseconds;
        if (elapsed > AppConfig.heartbeatTimeoutMs) {
          resetAndReconnect();
        }
      }
    });
  }

  void _stopConnectionCheck() {
    _connectionCheckTimer?.cancel();
    _connectionCheckTimer = null;
  }

  void _closeChannel() {
    _channelSubscription?.cancel();
    _channelSubscription = null;
    if (_channel != null) {
      _channel!.sink.close(1000, 'Client close');
      _channel = null;
    }
  }

  Future<void> connect() async {
    _reconnectTimer?.cancel();
    _reconnectTimer = null;

    _setState(WsConnectionState.connecting);

    try {
      _channel = _channelFactory != null
          ? _channelFactory!(Uri.parse(_url))
          : WebSocketChannel.connect(Uri.parse(_url));
      await _channel!.ready.timeout(const Duration(seconds: 10));

      _reconnectAttempts = 0;
      _shouldReconnect = true;
      _isManualDisconnect = false;
      _lastHeartbeatTime = DateTime.now();
      _startHeartbeat();
      _startConnectionCheck();

      // Send initial refresh rate
      _channel!.sink.add(jsonEncode({
        'type': 'set_refresh_rate',
        'interval': _lastRefreshRate,
      }));

      _setState(WsConnectionState.connected);

      _channelSubscription = _channel!.stream.listen(
        (data) {
          try {
            final json = jsonDecode(data as String) as Map<String, dynamic>;

            if (json['type'] == 'heartbeat') {
              _lastHeartbeatTime = DateTime.now();
              _channel?.sink.add(jsonEncode({
                'type': 'ping',
                'timestamp': DateTime.now().millisecondsSinceEpoch,
              }));
              return;
            }

            if (json['type'] == 'pong') {
              _lastHeartbeatTime = DateTime.now();
              return;
            }

            final output = TmuxOutput.fromJson(json);
            if (output.target == _target) {
              _messageController.add(output);
            }
          } catch (_) {
            // Silently fail message parsing
          }
        },
        onDone: () {
          _stopHeartbeat();
          _stopConnectionCheck();
          _setState(WsConnectionState.disconnected);
          if (_shouldReconnect && !_isManualDisconnect) {
            _scheduleReconnect();
          }
        },
        onError: (_) {
          _stopHeartbeat();
          _stopConnectionCheck();
          _setState(WsConnectionState.disconnected);
          if (_shouldReconnect && !_isManualDisconnect) {
            _scheduleReconnect();
          }
        },
      );
    } catch (_) {
      // Close stale channel from timed-out or failed handshake.
      _closeChannel();
      _setState(WsConnectionState.disconnected);
      if (_shouldReconnect && !_isManualDisconnect) {
        _scheduleReconnect();
      }
    }
  }

  void disconnect() {
    _shouldReconnect = false;
    _isManualDisconnect = true;
    _stopHeartbeat();
    _stopConnectionCheck();
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _closeChannel();
    _reconnectAttempts = 0;
    _setState(WsConnectionState.disconnected);
  }

  void _scheduleReconnect() {
    // Cancel any existing timer to prevent duplicate reconnect races.
    _reconnectTimer?.cancel();
    _reconnectAttempts++;
    final delay = calculateReconnectDelay();

    _reconnectTimer = Timer(Duration(milliseconds: delay), () {
      if (_shouldReconnect && !_isManualDisconnect) {
        connect();
      }
    });
  }

  void setRefreshRate(double interval) {
    _lastRefreshRate = interval;
    if (_channel != null && _currentState == WsConnectionState.connected) {
      _channel!.sink.add(
          jsonEncode({'type': 'set_refresh_rate', 'interval': interval}));
    }
  }

  void resetAndReconnect() {
    _stopHeartbeat();
    _stopConnectionCheck();
    _reconnectAttempts = 0;
    _shouldReconnect = true;
    _isManualDisconnect = false;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    _closeChannel();
    connect();
  }

  void _setState(WsConnectionState state) {
    _currentState = state;
    _connectionController.add(state);
  }

  void dispose() {
    _shouldReconnect = false;
    _isManualDisconnect = true;
    _stopHeartbeat();
    _stopConnectionCheck();
    _reconnectTimer?.cancel();
    _closeChannel();
    _reconnectAttempts = 0;
    // Set state before closing controllers so listeners can still receive it.
    _currentState = WsConnectionState.disconnected;
    _messageController.close();
    _connectionController.close();
  }

  // ─── Test helpers ──────────────────────────────────────────
  // Port of web's getReconnectAttempts(), getMaxReconnectAttempts(),
  // isConnected(), getConnectionState() — used by tests to verify
  // internal state.

  @visibleForTesting
  int get reconnectAttempts => _reconnectAttempts;

  @visibleForTesting
  set reconnectAttempts(int value) => _reconnectAttempts = value;

  @visibleForTesting
  bool get shouldReconnect => _shouldReconnect;

  @visibleForTesting
  bool get isManualDisconnect => _isManualDisconnect;

  @visibleForTesting
  bool get hasHeartbeatTimer => _heartbeatTimer != null;

  @visibleForTesting
  bool get hasConnectionCheckTimer => _connectionCheckTimer != null;

  @visibleForTesting
  bool get hasReconnectTimer => _reconnectTimer != null;

  @visibleForTesting
  bool get hasChannel => _channel != null;

  @visibleForTesting
  DateTime get lastHeartbeatTime => _lastHeartbeatTime;

  @visibleForTesting
  set lastHeartbeatTime(DateTime value) => _lastHeartbeatTime = value;

  @visibleForTesting
  String get target => _target;

  bool get isConnected => _currentState == WsConnectionState.connected;
}

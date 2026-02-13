import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../providers/output_provider.dart';
import '../providers/view_provider.dart';
import '../providers/websocket_provider.dart';
import '../providers/file_provider.dart';
import '../widgets/common/connection_status.dart';
import '../widgets/common/settings_sheet.dart';
import '../widgets/common/sidebar.dart';
import '../widgets/terminal/terminal_output.dart';
import '../widgets/terminal/command_input_area.dart';
import '../widgets/terminal/tmux_keyboard.dart';
import '../widgets/terminal/choice_buttons.dart';
import '../widgets/file/file_viewer.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with WidgetsBindingObserver {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // Connect WebSocket on start
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _connectWebSocket();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      // Reconnect on resume
      Future.delayed(
        const Duration(milliseconds: AppConfig.appResumeReconnectDelayMs),
        () {
          if (mounted) {
            ref.read(websocketServiceProvider).resetAndReconnect();
            ref.read(outputProvider.notifier).refresh();
          }
        },
      );
    } else if (state == AppLifecycleState.paused) {
      // Disconnect to save battery
      ref.read(websocketServiceProvider).disconnect();
    }
  }

  void _connectWebSocket() {
    final wsService = ref.read(websocketServiceProvider);
    final target = ref.read(selectedTargetProvider);
    wsService.setTarget(target);
    wsService.connect();
  }

  void _showSettings() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => const SettingsSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final viewMode = ref.watch(viewProvider);
    final selectedTarget = ref.watch(selectedTargetProvider);
    final fileState = ref.watch(fileProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        // If drawer is open, close it
        if (_scaffoldKey.currentState?.isDrawerOpen ?? false) {
          Navigator.of(context).pop();
          return;
        }
        // If viewing a file, go back to file list
        if (viewMode == ViewMode.file && fileState.selectedFile != null) {
          ref.read(fileProvider.notifier).clearSelectedFile();
          return;
        }
        // Otherwise let the system handle it
        Navigator.of(context).maybePop();
      },
      child: Scaffold(
        key: _scaffoldKey,
        appBar: AppBar(
          title: Text(
            viewMode == ViewMode.tmux
                ? 'tmux: $selectedTarget'
                : 'Files',
            style: const TextStyle(fontSize: 16),
          ),
          leading: IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () =>
                _scaffoldKey.currentState?.openDrawer(),
          ),
          actions: [
            const ConnectionStatus(),
            const SizedBox(width: 4),
            if (viewMode == ViewMode.tmux)
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () =>
                    ref.read(outputProvider.notifier).refresh(),
                tooltip: 'Refresh',
              ),
            IconButton(
              icon: const Icon(Icons.settings),
              onPressed: _showSettings,
              tooltip: 'Settings',
            ),
          ],
        ),
        drawer: Drawer(
          child: SafeArea(child: const Sidebar()),
        ),
        body: viewMode == ViewMode.tmux
            ? _buildTmuxView()
            : _buildFileView(),
      ),
    );
  }

  Widget _buildTmuxView() {
    return Column(
      children: [
        // Terminal output (takes most space)
        const Expanded(child: TerminalOutput()),
        // Choice buttons (auto-detected)
        const ChoiceButtons(),
        // Special keyboard buttons
        const TmuxKeyboard(),
        // Command input area
        const CommandInputArea(),
      ],
    );
  }

  Widget _buildFileView() {
    final fileState = ref.watch(fileProvider);

    if (fileState.selectedFile != null) {
      return const FileViewer();
    }

    // Show file explorer inline when no file is selected
    return const Padding(
      padding: EdgeInsets.all(8.0),
      child: SizedBox.expand(
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: FileExplorerInline(),
        ),
      ),
    );
  }
}

/// Inline version of file explorer for the main content area
class FileExplorerInline extends ConsumerStatefulWidget {
  const FileExplorerInline({super.key});

  @override
  ConsumerState<FileExplorerInline> createState() =>
      _FileExplorerInlineState();
}

class _FileExplorerInlineState extends ConsumerState<FileExplorerInline> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final state = ref.read(fileProvider);
      if (state.tree.isEmpty && !state.isLoadingTree) {
        ref.read(fileProvider.notifier).fetchTree();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(fileProvider);
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Path header
        Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: theme.colorScheme.surfaceContainerHighest,
          child: Text(
            state.currentPath,
            style: theme.textTheme.bodySmall
                ?.copyWith(fontFamily: 'monospace'),
          ),
        ),
        Expanded(
          child: state.isLoadingTree
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  children: [
                    if (state.currentPath != '/')
                      ListTile(
                        leading:
                            const Icon(Icons.folder_open, size: 20),
                        title: const Text('..'),
                        dense: true,
                        onTap: () {
                          final parent = state.currentPath.substring(
                              0,
                              state.currentPath.lastIndexOf('/'));
                          ref.read(fileProvider.notifier).navigateTo(
                              parent.isEmpty ? '/' : parent);
                        },
                      ),
                    ...state.tree.map((node) {
                      final icon = node.isDirectory
                          ? Icons.folder
                          : Icons.insert_drive_file;
                      return ListTile(
                        leading: Icon(icon, size: 20),
                        title: Text(node.name),
                        dense: true,
                        onTap: () {
                          if (node.isDirectory) {
                            ref
                                .read(fileProvider.notifier)
                                .navigateTo(node.path);
                          } else {
                            ref
                                .read(fileProvider.notifier)
                                .fetchFileContent(node.path);
                          }
                        },
                      );
                    }),
                  ],
                ),
        ),
      ],
    );
  }
}

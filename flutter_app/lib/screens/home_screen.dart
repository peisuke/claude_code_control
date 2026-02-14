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
    ref.watch(selectedTargetProvider);
    final fileState = ref.watch(fileProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (didPop) return;
        if (_scaffoldKey.currentState?.isDrawerOpen ?? false) {
          Navigator.of(context).pop();
          return;
        }
        if (viewMode == ViewMode.file && fileState.selectedFile != null) {
          ref.read(fileProvider.notifier).clearSelectedFile();
          return;
        }
        Navigator.of(context).maybePop();
      },
      child: Scaffold(
        key: _scaffoldKey,
        appBar: AppBar(
          toolbarHeight: 48,
          title: Text(
            viewMode == ViewMode.tmux ? 'Tmux Controller' : 'Files',
            style: const TextStyle(fontSize: 16),
          ),
          leading: IconButton(
            icon: const Icon(Icons.menu),
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          ),
          actions: [
            const ConnectionStatus(),
            const SizedBox(width: 4),
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

  /// Tmux view layout matching web TmuxViewContainer:
  /// ┌──────────────────────────┐
  /// │ TerminalOutput (flex: 1) │
  /// │ TmuxKeyboard             │
  /// ├──────────────────────────┤
  /// │ ChoiceButtons or         │
  /// │ CommandInputArea         │
  /// └──────────────────────────┘
  Widget _buildTmuxView() {
    return Column(
      children: [
        // Terminal output section (flex: 1)
        Expanded(
          child: Column(
            children: [
              const Expanded(child: TerminalOutput()),
              const TmuxKeyboard(),
            ],
          ),
        ),
        // Command input section (flex: none)
        const ChoiceButtons(),
        const CommandInputArea(),
      ],
    );
  }

  Widget _buildFileView() {
    final fileState = ref.watch(fileProvider);

    if (fileState.selectedFile != null) {
      return const FileViewer();
    }

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
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          color: theme.colorScheme.surfaceContainerHighest,
          child: Text(
            state.currentPath,
            style:
                theme.textTheme.bodySmall?.copyWith(fontFamily: 'monospace'),
          ),
        ),
        Expanded(
          child: state.isLoadingTree
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  children: [
                    if (state.currentPath != '/')
                      ListTile(
                        leading: const Icon(Icons.folder_open, size: 20),
                        title: const Text('..'),
                        dense: true,
                        onTap: () {
                          final parent = state.currentPath.substring(
                              0, state.currentPath.lastIndexOf('/'));
                          ref
                              .read(fileProvider.notifier)
                              .navigateTo(parent.isEmpty ? '/' : parent);
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

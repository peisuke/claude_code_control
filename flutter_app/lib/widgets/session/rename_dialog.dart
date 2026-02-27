import 'package:flutter/material.dart';

Future<String?> showRenameDialog(
  BuildContext context, {
  required String title,
  required String currentName,
}) {
  return showDialog<String>(
    context: context,
    builder: (context) => _RenameDialog(title: title, currentName: currentName),
  );
}

class _RenameDialog extends StatefulWidget {
  final String title;
  final String currentName;

  const _RenameDialog({required this.title, required this.currentName});

  @override
  State<_RenameDialog> createState() => _RenameDialogState();
}

class _RenameDialogState extends State<_RenameDialog> {
  static final _validNamePattern = RegExp(r'^[a-zA-Z0-9_\-\.]+$');

  late final TextEditingController _controller;
  String? _errorText;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.currentName);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final newName = _controller.text.trim();
    if (newName.isEmpty || newName == widget.currentName) return;
    if (!_validNamePattern.hasMatch(newName)) {
      setState(() {
        _errorText = 'Only letters, numbers, dash, underscore, dot allowed';
      });
      return;
    }
    Navigator.of(context).pop(newName);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: TextField(
        controller: _controller,
        autofocus: true,
        maxLength: 128,
        decoration: InputDecoration(
          labelText: 'Name',
          errorText: _errorText,
        ),
        onChanged: (_) {
          if (_errorText != null) setState(() => _errorText = null);
        },
        onSubmitted: (_) => _submit(),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(null),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Rename'),
        ),
      ],
    );
  }
}

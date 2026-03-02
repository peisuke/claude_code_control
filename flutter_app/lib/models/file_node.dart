class FileNode {
  final String name;
  final String path;
  final String type; // 'file' or 'directory'
  final List<FileNode>? children;
  final DateTime? modified;

  const FileNode({
    required this.name,
    required this.path,
    required this.type,
    this.children,
    this.modified,
  });

  bool get isDirectory => type == 'directory';

  factory FileNode.fromJson(Map<String, dynamic> json) {
    DateTime? modified;
    final rawModified = json['modified'];
    if (rawModified is num) {
      modified = DateTime.fromMillisecondsSinceEpoch(
        (rawModified * 1000).toInt(),
        isUtc: true,
      ).toLocal();
    }

    return FileNode(
      name: json['name'] as String? ?? '',
      path: json['path'] as String? ?? '',
      type: json['type'] as String? ?? 'file',
      children: json['children'] != null
          ? (json['children'] as List<dynamic>)
              .map((e) => FileNode.fromJson(e as Map<String, dynamic>))
              .toList()
          : null,
      modified: modified,
    );
  }
}

class FileTreeResponse {
  final List<FileNode> tree;
  final String currentPath;

  const FileTreeResponse({required this.tree, required this.currentPath});

  factory FileTreeResponse.fromJson(Map<String, dynamic> json) {
    return FileTreeResponse(
      tree: (json['tree'] as List<dynamic>? ?? [])
          .map((e) => FileNode.fromJson(e as Map<String, dynamic>))
          .toList(),
      currentPath: json['current_path'] as String? ?? '/',
    );
  }
}

class FileContentResponse {
  final String content;
  final String path;
  final bool isImage;
  final String? mimeType;

  const FileContentResponse({
    required this.content,
    required this.path,
    this.isImage = false,
    this.mimeType,
  });

  factory FileContentResponse.fromJson(Map<String, dynamic> json) {
    return FileContentResponse(
      content: json['content'] as String? ?? '',
      path: json['path'] as String? ?? '',
      isImage: json['is_image'] as bool? ?? false,
      mimeType: json['mime_type'] as String?,
    );
  }
}

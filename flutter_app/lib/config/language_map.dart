/// Port of getLanguageFromFileName() from
/// frontend/src/components/file/FileOperations.tsx lines 38-84.
///
/// Maps file extensions (and special filenames) to highlight.js language IDs.

/// Extension → highlight.js language ID.
const Map<String, String> _extensionMap = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'go': 'go',
  'rs': 'rust',
  'cpp': 'cpp',
  'c': 'c',
  'h': 'c',
  'java': 'java',
  'kt': 'kotlin',
  'swift': 'swift',
  'php': 'php',
  'css': 'css',
  'scss': 'scss',
  'sass': 'scss',
  'less': 'less',
  'html': 'xml',
  'xml': 'xml',
  'json': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'ini',
  'md': 'markdown',
  'sh': 'bash',
  'bash': 'bash',
  'zsh': 'bash',
  'fish': 'bash',
  'ps1': 'powershell',
  'bat': 'dos',
  'dockerfile': 'dockerfile',
  'sql': 'sql',
  'vim': 'vim',
  'lua': 'lua',
  'r': 'r',
  'dart': 'dart',
  'vue': 'xml',
  'svelte': 'xml',
  'ini': 'ini',
  'cfg': 'ini',
  'conf': 'ini',
  'properties': 'properties',
  'gradle': 'groovy',
  'groovy': 'groovy',
  'pl': 'perl',
  'pm': 'perl',
  'makefile': 'makefile',
  'mk': 'makefile',
  'cmake': 'cmake',
  'proto': 'protobuf',
  'tf': 'hcl',
  'hcl': 'hcl',
  'nginx': 'nginx',
  'lock': 'json',
};

/// Full filename → language (for extensionless files).
const Map<String, String> _filenameMap = {
  'dockerfile': 'dockerfile',
  'makefile': 'makefile',
  'cmakelists.txt': 'cmake',
  'gemfile': 'ruby',
  'rakefile': 'ruby',
  'vagrantfile': 'ruby',
  'jenkinsfile': 'groovy',
};

/// Returns the highlight.js language ID for the given [fileName],
/// or `null` if no mapping is found (caller should fall back to plain text).
String? getLanguageFromFileName(String fileName) {
  final name = fileName.split('/').last;
  final lower = name.toLowerCase();

  // Check full filename first (Dockerfile, Makefile, etc.)
  final byName = _filenameMap[lower];
  if (byName != null) return byName;

  // Check by extension
  final dotIndex = lower.lastIndexOf('.');
  if (dotIndex == -1 || dotIndex == lower.length - 1) return null;
  final ext = lower.substring(dotIndex + 1);
  return _extensionMap[ext];
}

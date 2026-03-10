import 'package:flutter_test/flutter_test.dart';
import 'package:tmux_control/config/language_map.dart';

void main() {
  group('getLanguageFromFileName', () {
    test('maps common extensions to language IDs', () {
      expect(getLanguageFromFileName('main.py'), 'python');
      expect(getLanguageFromFileName('index.js'), 'javascript');
      expect(getLanguageFromFileName('app.ts'), 'typescript');
      expect(getLanguageFromFileName('style.css'), 'css');
      expect(getLanguageFromFileName('page.html'), 'xml');
      expect(getLanguageFromFileName('data.json'), 'json');
      expect(getLanguageFromFileName('config.yaml'), 'yaml');
      expect(getLanguageFromFileName('config.yml'), 'yaml');
      expect(getLanguageFromFileName('script.sh'), 'bash');
      expect(getLanguageFromFileName('main.dart'), 'dart');
      expect(getLanguageFromFileName('Main.java'), 'java');
      expect(getLanguageFromFileName('main.go'), 'go');
      expect(getLanguageFromFileName('main.rs'), 'rust');
      expect(getLanguageFromFileName('query.sql'), 'sql');
      expect(getLanguageFromFileName('readme.md'), 'markdown');
    });

    test('is case insensitive for extensions', () {
      expect(getLanguageFromFileName('file.PY'), 'python');
      expect(getLanguageFromFileName('file.Js'), 'javascript');
      expect(getLanguageFromFileName('FILE.DART'), 'dart');
      expect(getLanguageFromFileName('page.HTML'), 'xml');
    });

    test('handles extensionless files by full name match', () {
      expect(getLanguageFromFileName('Dockerfile'), 'dockerfile');
      expect(getLanguageFromFileName('Makefile'), 'makefile');
      expect(getLanguageFromFileName('Gemfile'), 'ruby');
      expect(getLanguageFromFileName('Rakefile'), 'ruby');
      expect(getLanguageFromFileName('Jenkinsfile'), 'groovy');
    });

    test('is case insensitive for full filename match', () {
      expect(getLanguageFromFileName('dockerfile'), 'dockerfile');
      expect(getLanguageFromFileName('DOCKERFILE'), 'dockerfile');
      expect(getLanguageFromFileName('makefile'), 'makefile');
      expect(getLanguageFromFileName('MAKEFILE'), 'makefile');
    });

    test('returns null for unknown extensions', () {
      expect(getLanguageFromFileName('file.xyz'), isNull);
      expect(getLanguageFromFileName('file.wasm'), isNull);
      expect(getLanguageFromFileName('file.bin'), isNull);
    });

    test('returns null for files with no extension and no name match', () {
      expect(getLanguageFromFileName('somefile'), isNull);
      expect(getLanguageFromFileName('README'), isNull);
    });

    test('handles paths with directories', () {
      expect(getLanguageFromFileName('/home/user/project/main.py'), 'python');
      expect(getLanguageFromFileName('src/components/App.tsx'), 'typescript');
      expect(getLanguageFromFileName('/usr/local/bin/Dockerfile'), 'dockerfile');
    });

    test('handles files with multiple dots', () {
      expect(getLanguageFromFileName('app.module.ts'), 'typescript');
      expect(getLanguageFromFileName('style.module.css'), 'css');
      expect(getLanguageFromFileName('package.lock.json'), 'json');
    });
  });
}

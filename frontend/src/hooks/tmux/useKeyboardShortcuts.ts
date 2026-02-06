import { useEffect, useCallback, useRef } from 'react';
import { KEYBOARD_COMMANDS } from '../../constants/keyboard';

interface UseKeyboardShortcutsOptions {
  enabled: boolean;
  onSendKeyboardCommand: (command: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
}

/**
 * Hook to handle keyboard shortcuts for tmux commands in desktop mode
 *
 * Shortcuts:
 * - Ctrl+O: History expansion (履歴展開)
 * - Shift+Tab: Previous completion (前方移動)
 * - Escape: Send ESC key
 * - Ctrl+C: Interrupt process (プロセス終了)
 * - Ctrl+L: Clear screen (画面クリア)
 */
export const useKeyboardShortcuts = ({
  enabled,
  onSendKeyboardCommand,
  isConnected,
  isLoading
}: UseKeyboardShortcutsOptions): void => {
  const isProcessingRef = useRef(false);

  const handleKeyDown = useCallback(async (event: KeyboardEvent) => {
    if (!enabled || !isConnected || isLoading || isProcessingRef.current) {
      return;
    }

    // Skip if user is typing in an input field (except for specific shortcuts)
    const target = event.target as HTMLElement;
    const isInputField = target.tagName === 'INPUT' ||
                         target.tagName === 'TEXTAREA' ||
                         target.isContentEditable;

    let command: string | null = null;

    // Ctrl+O - History expansion
    if (event.ctrlKey && event.key === 'o') {
      event.preventDefault();
      command = KEYBOARD_COMMANDS.CTRL_O;
    }
    // Shift+Tab - Previous completion
    else if (event.shiftKey && event.key === 'Tab') {
      event.preventDefault();
      command = KEYBOARD_COMMANDS.SHIFT_TAB;
    }
    // Escape - Send ESC key (allow even in input fields for modal dismiss etc.)
    else if (event.key === 'Escape' && !isInputField) {
      event.preventDefault();
      command = KEYBOARD_COMMANDS.ESCAPE;
    }
    // Ctrl+C - Interrupt process (only when not in input field to allow copy)
    else if (event.ctrlKey && event.key === 'c' && !isInputField) {
      event.preventDefault();
      command = KEYBOARD_COMMANDS.CTRL_C;
    }
    // Ctrl+L - Clear screen
    else if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      command = KEYBOARD_COMMANDS.CLEAR_SCREEN;
    }

    if (command) {
      isProcessingRef.current = true;
      try {
        await onSendKeyboardCommand(command);
      } finally {
        isProcessingRef.current = false;
      }
    }
  }, [enabled, isConnected, isLoading, onSendKeyboardCommand]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
};

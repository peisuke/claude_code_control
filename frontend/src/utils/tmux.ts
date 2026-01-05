import { KEYBOARD_COMMANDS } from '../constants/keyboard';

/**
 * Utility functions for tmux command handling
 */
export class TmuxUtils {
  /**
   * Validate if command is not empty after trimming
   */
  static isValidCommand(command: string): boolean {
    return command.trim().length > 0;
  }

  /**
   * Parse tmux target format (session:window.pane)
   */
  static parseTarget(target: string): { session: string; window?: string; pane?: string } {
    const parts = target.split(':');
    const session = parts[0];
    
    if (parts.length === 1) {
      return { session };
    }

    const windowPane = parts[1];
    const windowParts = windowPane.split('.');
    
    if (windowParts.length === 1) {
      return { session, window: windowParts[0] };
    }

    return { 
      session, 
      window: windowParts[0], 
      pane: windowParts[1] 
    };
  }

  /**
   * Build tmux target string
   */
  static buildTarget(session: string, window?: string, pane?: string): string {
    let target = session;
    if (window) {
      target += `:${window}`;
      if (pane) {
        target += `.${pane}`;
      }
    }
    return target;
  }

  /**
   * Get keyboard command by key name
   */
  static getKeyboardCommand(key: keyof typeof KEYBOARD_COMMANDS): string {
    return KEYBOARD_COMMANDS[key];
  }

  /**
   * Check if target is valid format
   */
  static isValidTarget(target: string): boolean {
    if (!target || target.trim().length === 0) {
      return false;
    }

    // Basic validation: should not contain invalid characters
    const invalidChars = /[<>"|*?]/;
    return !invalidChars.test(target);
  }

  /**
   * Sanitize command for safe execution
   */
  static sanitizeCommand(command: string): string {
    return command.trim();
  }

  /**
   * Format session name for display
   */
  static formatSessionName(session: string): string {
    return session.replace(/[_-]/g, ' ').trim();
  }
}
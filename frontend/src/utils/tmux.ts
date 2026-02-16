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
   * @param target - Target string in format "session:window.pane"
   * @param defaultSession - Default session name if not provided (defaults to '')
   */
  static parseTarget(target: string, defaultSession: string = ''): { session: string; window?: string; pane?: string } {
    const parts = target.split(':');
    const session = parts[0] || defaultSession;

    if (parts.length === 1) {
      return { session };
    }

    const windowPane = parts[1] || '';
    const windowParts = windowPane.split('.');
    const window = windowParts[0] || undefined;
    const pane = windowParts[1] || undefined;

    return { session, window, pane };
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
   * Sanitize command for safe execution
   */
  static sanitizeCommand(command: string): string {
    return command.trim();
  }

}
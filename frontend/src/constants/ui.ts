// UI constants for consistent design
export const LAYOUT = {
  COMMAND_INPUT_MIN_ROWS: 3,
} as const;

export const TIMING = {
  COMMAND_REFRESH_DELAY: 500,
  APP_RESUME_RECONNECT_DELAY: 1500,
  SCROLL_ANIMATION_DELAY: 50,
  REFRESH_INTERVAL_FAST: 0.1,
  REFRESH_INTERVAL_NORMAL: 2,
} as const;

export const TERMINAL = {
  FONT_FAMILY: 'Monaco, Menlo, "Ubuntu Mono", monospace',
  BACKGROUND_COLOR: '#000000',
  TEXT_COLOR: '#f0f0f0',
  FONT_SIZES: {
    xs: '10px',
    sm: '12px',
    md: '14px',
  },
} as const;

export const VIEW_MODES = {
  TMUX: 'tmux',
  FILE: 'file',
} as const;

export const LABELS = {
  BUTTONS: {
    SEND: '送信',
    ENTER: 'Enter',
    EXPAND_COMMAND: 'コマンド欄を拡大',
    COLLAPSE_COMMAND: 'コマンド欄を縮小',
  },
  PLACEHOLDERS: {
    COMMAND_INPUT: 'ls -la',
    TMUX_OUTPUT: 'tmux出力がここに表示されます...',
  },
} as const;
// UI constants for consistent design
export const LAYOUT = {
  HEADER_HEIGHT: '64px',
  SIDEBAR_WIDTH: '280px',
  COMMAND_INPUT_MIN_ROWS: 3,
  COMMAND_INPUT_EXPANDED_ROWS: 20,
  OUTPUT_MIN_HEIGHT: '200px',
} as const;

export const TIMING = {
  COMMAND_REFRESH_DELAY: 500,
  APP_RESUME_RECONNECT_DELAY: 1500,
  VISIBILITY_RECONNECT_DELAY: 1000,
  SCROLL_ANIMATION_DELAY: 50,
  HISTORY_REFRESH_DELAY: 100,
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

export const ANIMATION = {
  SPIN_DURATION: '1s',
  PULSE_DURATION: '2s',
  HOVER_ROTATION: 'rotate(180deg)',
  TRANSITION_DURATION: '0.3s',
} as const;

export const VIEW_MODES = {
  TMUX: 'tmux',
  FILE: 'file',
} as const;

export const LABELS = {
  CONNECTION_STATUS: {
    CONNECTED: '接続中',
    DISCONNECTED: '切断',
    RECONNECTING: '再接続中',
    OFFLINE: 'オフライン',
  },
  BUTTONS: {
    SEND: '送信',
    ENTER: 'Enter',
    SETTINGS: '設定',
    HISTORY: '履歴を表示',
    AUTO_REFRESH: '自動更新',
    MANUAL_RECONNECT: '手動で再接続を試行',
    EXPAND_COMMAND: 'コマンド欄を拡大',
    COLLAPSE_COMMAND: 'コマンド欄を縮小',
  },
  PLACEHOLDERS: {
    COMMAND_INPUT: 'ls -la',
    TMUX_OUTPUT: 'tmux出力がここに表示されます...',
  },
  TOOLTIPS: {
    NETWORK_OFFLINE: 'ネットワーク接続がありません。接続を確認してください。',
    SERVER_CONNECTED: 'サーバーと正常に接続されています',
    RECONNECTING: 'サーバーへの再接続を試行中です...',
    SERVER_DISCONNECTED: 'サーバーとの接続が切断されています。手動で再接続してください。',
  },
} as const;
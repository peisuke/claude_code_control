export interface CommandRequest {
  command: string;
  target?: string; // Can be session, session:window, or session:window.pane
}

export interface TmuxSettings {
  session_name: string;
  auto_create_session: boolean;
  capture_history: boolean;
}

export interface TmuxOutput {
  content: string;
  timestamp: string;
  target: string;
}

export interface TmuxPane {
  index: string;
  active: boolean;
  command: string;
  size?: string;
}

export interface TmuxWindow {
  index: string;
  name: string;
  active: boolean;
  pane_count?: number;
  panes: Record<string, TmuxPane>;
}

export interface TmuxSession {
  name: string;
  windows: Record<string, TmuxWindow>;
}

export interface TmuxHierarchy {
  sessions: Record<string, TmuxSession>;
}

export interface TmuxTarget {
  session: string;
  window?: string;
  pane?: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}
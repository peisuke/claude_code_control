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

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileTreeResponse {
  tree: FileNode[];
  current_path: string;
}

export interface FileContentResponse {
  content: string;
  path: string;
  is_image?: boolean;
  mime_type?: string;
}
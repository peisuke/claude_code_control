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

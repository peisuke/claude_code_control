from fastapi import APIRouter, HTTPException
from typing import List, Optional
import os
import pathlib

from ..models import ApiResponse

router = APIRouter(prefix="/api/files", tags=["files"])

# Configuration
ALLOWED_EXTENSIONS = {'.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.css', '.html', '.sh', '.env', '.log', '.conf', '.cfg', '.ini', '.xml', '.sql', '.csv', '.php', '.rb', '.go', '.rs', '.cpp', '.c', '.h', '.java', '.kt', '.swift', '.dart', '.vue', '.svelte', '.scss', '.sass', '.less', '.R', '.m', '.pl', '.lua', '.vim', '.zsh', '.bash', '.fish', '.ps1', '.bat', '.dockerfile', '.gitignore', '.gitattributes', '.editorconfig', '.prettierrc', '.eslintrc', '.babelrc', '.config', '.profile', '.bashrc', '.zshrc', '.vimrc', ''}
MAX_FILE_SIZE = 1024 * 1024 * 5  # 5MB
BASE_PATH = '/'  # Filesystem root as base
INITIAL_PATH = os.getcwd()  # Current working directory as starting point

# Hidden files/directories that should be shown
ALLOWED_HIDDEN = {'.bashrc', '.profile', '.zshrc', '.vimrc', '.gitignore', '.gitattributes', '.env', '.config', '.ssh'}

# System directories to skip for performance and security
BLOCKED_DIRECTORIES = {
    'proc', 'sys', 'dev', 'run', 'tmp', 'var/log', 'var/cache', 'var/tmp',
    'node_modules', '__pycache__', '.git', 'dist', 'build', '.vscode-server', 
    '.docker', 'snap', 'lost+found', 'boot', 'media', 'mnt'
}

def is_safe_path(path: str) -> bool:
    """Check if the path is safe (within filesystem bounds)"""
    try:
        # Normalize the path to prevent directory traversal
        requested_path = os.path.abspath(path)
        # Allow any path within the filesystem root
        return requested_path.startswith('/')
    except:
        return False

def get_file_tree(directory: str, max_depth: int = 1, current_depth: int = 0) -> List[dict]:
    """Get file tree structure from the specified directory (non-recursive for performance)"""
    items = []
    
    # Limit the number of items to prevent performance issues
    MAX_ITEMS = 1000
    item_count = 0
    
    try:
        # Get list of items and sort them (directories first, then files)
        all_items = os.listdir(directory)
        
        # Separate directories and files
        directories = []
        files = []
        
        for item in all_items:
            if item_count >= MAX_ITEMS:
                break
                
            item_path = os.path.join(directory, item)
            
            # Skip certain hidden files but allow some important ones
            if item.startswith('.') and item not in ALLOWED_HIDDEN:
                continue
            
            try:
                if os.path.isdir(item_path):
                    directories.append(item)
                else:
                    files.append(item)
                item_count += 1
            except (PermissionError, OSError):
                continue
        
        # Sort directories and files separately
        directories.sort()
        files.sort()
        
        # Add directories first
        for item in directories:
            if len(items) >= MAX_ITEMS:
                break
                
            item_path = os.path.join(directory, item)
            absolute_path = os.path.abspath(item_path)
            
            # Skip certain system directories that are typically large or not useful
            if item in BLOCKED_DIRECTORIES:
                continue
            
            items.append({
                'name': item,
                'path': absolute_path,
                'type': 'directory',
                'children': []  # Don't load children recursively for performance
            })
        
        # Add files
        for item in files:
            if len(items) >= MAX_ITEMS:
                break
                
            item_path = os.path.join(directory, item)
            absolute_path = os.path.abspath(item_path)
            
            # Include files with allowed extensions or no extension
            file_ext = os.path.splitext(item)[1].lower()
            if file_ext in ALLOWED_EXTENSIONS or not file_ext:
                items.append({
                    'name': item,
                    'path': absolute_path,
                    'type': 'file'
                })
                
    except PermissionError:
        pass
    except Exception as e:
        print(f"[ERROR] Error reading directory {directory}: {e}")
        
    return items

@router.get("/tree")
async def get_tree(path: str = ""):
    """Get file tree structure from the specified path"""
    import time
    start_time = time.time()
    
    try:
        # If no path provided, use the initial working directory
        if not path or path == "/":
            target_path = INITIAL_PATH
        else:
            target_path = os.path.abspath(path)
            
        print(f"[DEBUG] get_tree called with path: {path}")
        print(f"[DEBUG] target_path: {target_path}")
        
        if not is_safe_path(target_path):
            print(f"[DEBUG] Access denied for path: {target_path}")
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not os.path.exists(target_path):
            print(f"[DEBUG] Path not found: {target_path}")
            raise HTTPException(status_code=404, detail="Path not found")
            
        if not os.path.isdir(target_path):
            print(f"[DEBUG] Path is not a directory: {target_path}")
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        # Check if this is a potentially slow directory
        dir_name = os.path.basename(target_path)
        if dir_name in BLOCKED_DIRECTORIES:
            raise HTTPException(status_code=403, detail="Access to this directory is restricted for performance reasons")
            
        tree = get_file_tree(target_path)
        end_time = time.time()
        
        print(f"[DEBUG] Tree generated in {end_time - start_time:.2f}s, items count: {len(tree)}")
        if tree:
            print(f"[DEBUG] First few items: {[item['name'] for item in tree[:5]]}")
        
        return ApiResponse(
            success=True,
            message="File tree retrieved successfully",
            data={'tree': tree, 'current_path': target_path, 'load_time': round(end_time - start_time, 2)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting file tree: {str(e)}"
        )

@router.get("/content")
async def get_file_content(path: str):
    """Get content of a specific file"""
    try:
        # Use absolute path directly
        full_path = os.path.abspath(path)
        
        if not is_safe_path(full_path):
            raise HTTPException(status_code=403, detail="Access denied")
        
        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        if not os.path.isfile(full_path):
            raise HTTPException(status_code=400, detail="Path is not a file")
            
        # Check file size
        file_size = os.path.getsize(full_path)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
            
        # Read file content
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            try:
                with open(full_path, 'r', encoding='latin-1') as f:
                    content = f.read()
            except:
                raise HTTPException(status_code=422, detail="Unable to decode file content")
                
        return ApiResponse(
            success=True,
            message="File content retrieved successfully",
            data={
                'path': path,
                'content': content,
                'size': file_size
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading file: {str(e)}"
        )

@router.get("/search")
async def search_files(query: str, path: str = "/"):
    """Search for files by name"""
    try:
        if not is_safe_path(path):
            raise HTTPException(status_code=403, detail="Access denied")
            
        if not query or len(query) < 2:
            raise HTTPException(status_code=400, detail="Query must be at least 2 characters")
            
        full_path = os.path.join(BASE_PATH, path.lstrip('/'))
        results = []
        
        for root, dirs, files in os.walk(full_path):
            # Skip hidden and common directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['node_modules', '__pycache__', 'dist', 'build']]
            
            for file in files:
                if query.lower() in file.lower():
                    if any(file.endswith(ext) for ext in ALLOWED_EXTENSIONS):
                        file_path = os.path.join(root, file)
                        relative_path = os.path.relpath(file_path, BASE_PATH)
                        results.append({
                            'name': file,
                            'path': '/' + relative_path.replace('\\', '/'),
                            'type': 'file'
                        })
                        
            # Limit results
            if len(results) >= 50:
                break
                
        return ApiResponse(
            success=True,
            message=f"Found {len(results)} results",
            data={'results': results}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error searching files: {str(e)}"
        )
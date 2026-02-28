from fastapi import APIRouter, HTTPException
from typing import List
import os
import base64
import logging
import mimetypes

from ..models import ApiResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/files", tags=["files"])

# Configuration
ALLOWED_EXTENSIONS = {'.py', '.js', '.ts', '.tsx', '.jsx', '.json', '.md', '.txt', '.yml', '.yaml', '.toml', '.css', '.html', '.sh', '.env', '.log', '.conf', '.cfg', '.ini', '.xml', '.sql', '.csv', '.php', '.rb', '.go', '.rs', '.cpp', '.c', '.h', '.java', '.kt', '.swift', '.dart', '.vue', '.svelte', '.scss', '.sass', '.less', '.R', '.m', '.pl', '.lua', '.vim', '.zsh', '.bash', '.fish', '.ps1', '.bat', '.dockerfile', '.gitignore', '.gitattributes', '.editorconfig', '.prettierrc', '.eslintrc', '.babelrc', '.config', '.profile', '.bashrc', '.zshrc', '.vimrc', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp', '.ico', ''}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.bmp', '.webp', '.ico'}
MAX_FILE_SIZE = 1024 * 1024 * 5  # 5MB
INITIAL_PATH = os.environ.get('WORKSPACE_DIR') or os.path.expanduser('~')

# Allowed base paths - restrict file access to these directories only
ALLOWED_BASE_PATHS = [
    os.path.expanduser('~'),  # User's home directory
    '/tmp',
    '/home',
    '/workspace',
    os.getcwd(),  # Current working directory
]
# Include WORKSPACE_DIR so custom paths are accessible via the file browser
_workspace_dir = os.environ.get('WORKSPACE_DIR')
if _workspace_dir and os.path.realpath(_workspace_dir) not in [os.path.realpath(p) for p in ALLOWED_BASE_PATHS]:
    ALLOWED_BASE_PATHS.append(_workspace_dir)

# Hidden files/directories that should be shown
ALLOWED_HIDDEN = {'.bashrc', '.profile', '.zshrc', '.vimrc', '.gitignore', '.gitattributes', '.env', '.config', '.ssh'}

# System directories to skip for performance and security
BLOCKED_DIRECTORIES = {
    'proc', 'sys', 'dev', 'run', 'var', 'etc', 'root', 'boot', 'sbin', 'bin',
    'lib', 'lib64', 'usr', 'opt', 'srv', 'media', 'mnt', 'snap', 'lost+found',
    'node_modules', '__pycache__', '.git', 'dist', 'build', '.vscode-server',
    '.docker', '.cache', '.local/share/Trash'
}

# Sensitive file patterns that should never be accessible
BLOCKED_FILES = {
    'id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa',  # SSH private keys
    '.pem', '.key', '.p12', '.pfx',  # Certificate private keys
    'shadow', 'passwd', 'sudoers',  # System files
    '.aws/credentials', '.netrc', '.npmrc',  # Credential files
}

def is_safe_path(path: str) -> bool:
    """Check if the path is safe (within allowed base paths)"""
    try:
        # Normalize the path to prevent directory traversal
        requested_path = os.path.realpath(path)

        # Check if path is within any allowed base path
        for base_path in ALLOWED_BASE_PATHS:
            normalized_base = os.path.realpath(base_path)
            if requested_path.startswith(normalized_base + os.sep) or requested_path == normalized_base:
                return True

        return False
    except Exception:
        return False

def is_blocked_file(path: str) -> bool:
    """Check if a file should be blocked for security reasons"""
    try:
        filename = os.path.basename(path)
        file_ext = os.path.splitext(filename)[1].lower()

        # Check against blocked filenames
        if filename in BLOCKED_FILES:
            return True

        # Check against blocked extensions
        if file_ext in {'.pem', '.key', '.p12', '.pfx'}:
            return True

        # Check if path contains sensitive patterns
        normalized_path = path.lower()
        sensitive_patterns = ['/.ssh/id_', '/credentials', '/secrets', '/.aws/']
        for pattern in sensitive_patterns:
            if pattern in normalized_path:
                return True

        return False
    except Exception:
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
        logger.error(f"Error reading directory {directory}: {e}")
        
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
            
        logger.debug(f"get_tree called with path: {path}")
        logger.debug(f"target_path: {target_path}")
        
        if not is_safe_path(target_path):
            logger.warning(f"Access denied for path outside allowed directories: {target_path}")
            raise HTTPException(status_code=403, detail="Access denied: path outside allowed directories")
        
        if not os.path.exists(target_path):
            logger.debug(f"Path not found: {target_path}")
            raise HTTPException(status_code=404, detail="Path not found")
            
        if not os.path.isdir(target_path):
            logger.debug(f"Path is not a directory: {target_path}")
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        # Check if this is a potentially slow directory
        dir_name = os.path.basename(target_path)
        if dir_name in BLOCKED_DIRECTORIES:
            raise HTTPException(status_code=403, detail="Access to this directory is restricted for performance reasons")
            
        tree = get_file_tree(target_path)
        end_time = time.time()
        
        logger.debug(f"Tree generated in {end_time - start_time:.2f}s, items count: {len(tree)}")
        
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
        full_path = os.path.realpath(path)

        if not is_safe_path(full_path):
            logger.warning(f"Access denied for path outside allowed directories: {path}")
            raise HTTPException(status_code=403, detail="Access denied: path outside allowed directories")

        if is_blocked_file(full_path):
            logger.warning(f"Access denied for sensitive file: {path}")
            raise HTTPException(status_code=403, detail="Access denied: sensitive file")

        if not os.path.exists(full_path):
            raise HTTPException(status_code=404, detail="File not found")

        if not os.path.isfile(full_path):
            raise HTTPException(status_code=400, detail="Path is not a file")

        # Check file size
        file_size = os.path.getsize(full_path)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")

        # Check if file is an image
        file_ext = os.path.splitext(full_path)[1].lower()
        is_image = file_ext in IMAGE_EXTENSIONS

        if is_image:
            # Read binary content and encode to base64
            try:
                with open(full_path, 'rb') as f:
                    binary_content = f.read()
                    base64_content = base64.b64encode(binary_content).decode('utf-8')

                # Get MIME type
                mime_type, _ = mimetypes.guess_type(full_path)
                if not mime_type:
                    mime_type = 'application/octet-stream'

                return ApiResponse(
                    success=True,
                    message="Image file retrieved successfully",
                    data={
                        'path': path,
                        'content': base64_content,
                        'size': file_size,
                        'is_image': True,
                        'mime_type': mime_type
                    }
                )
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Unable to read image file: {str(e)}")
        else:
            # Read text file content
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
                    'size': file_size,
                    'is_image': False
                }
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error reading file: {str(e)}"
        )
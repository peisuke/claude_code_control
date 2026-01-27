"""Tests for file router"""
import pytest
from httpx import AsyncClient, ASGITransport
import os
import tempfile
import base64

from app.main import app


@pytest.fixture
def temp_directory():
    """Create a temporary directory for testing"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test files
        test_file = os.path.join(tmpdir, "test.txt")
        with open(test_file, "w") as f:
            f.write("Hello World")

        test_py = os.path.join(tmpdir, "test.py")
        with open(test_py, "w") as f:
            f.write("print('hello')")

        # Create subdirectory
        subdir = os.path.join(tmpdir, "subdir")
        os.makedirs(subdir)

        nested_file = os.path.join(subdir, "nested.txt")
        with open(nested_file, "w") as f:
            f.write("Nested content")

        yield tmpdir


@pytest.fixture
def temp_image_file():
    """Create a temporary PNG image file"""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        # Write a minimal valid PNG header
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        f.write(png_data)
        f.flush()
        yield f.name
    os.unlink(f.name)


class TestGetFileTree:
    """Tests for GET /api/files/tree endpoint"""

    @pytest.mark.asyncio
    async def test_get_tree_default_path(self):
        """Test getting file tree with default path"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/tree")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "tree" in data["data"]
        assert "current_path" in data["data"]

    @pytest.mark.asyncio
    async def test_get_tree_specific_path(self, temp_directory):
        """Test getting file tree from specific path"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/tree?path={temp_directory}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["current_path"] == temp_directory

        # Check that test files are in the tree
        names = [item["name"] for item in data["data"]["tree"]]
        assert "test.txt" in names
        assert "test.py" in names
        assert "subdir" in names

    @pytest.mark.asyncio
    async def test_get_tree_path_not_found(self):
        """Test getting tree from non-existent path"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/tree?path=/nonexistent/path/12345")

        # Should either return 404 (not found) or 403 (outside allowed paths)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_get_tree_file_instead_of_directory(self, temp_directory):
        """Test getting tree from a file path instead of directory"""
        file_path = os.path.join(temp_directory, "test.txt")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/tree?path={file_path}")

        assert response.status_code == 400
        assert "not a directory" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_tree_home_directory(self):
        """Test getting tree from home directory"""
        home_dir = os.path.expanduser("~")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/tree?path={home_dir}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestGetFileContent:
    """Tests for GET /api/files/content endpoint"""

    @pytest.mark.asyncio
    async def test_get_text_file_content(self, temp_directory):
        """Test getting content of a text file"""
        file_path = os.path.join(temp_directory, "test.txt")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/content?path={file_path}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["content"] == "Hello World"
        assert data["data"]["is_image"] is False

    @pytest.mark.asyncio
    async def test_get_python_file_content(self, temp_directory):
        """Test getting content of a Python file"""
        file_path = os.path.join(temp_directory, "test.py")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/content?path={file_path}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "print" in data["data"]["content"]

    @pytest.mark.asyncio
    async def test_get_image_file_content(self, temp_image_file):
        """Test getting content of an image file"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/content?path={temp_image_file}")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["is_image"] is True
        assert data["data"]["mime_type"] == "image/png"
        # Content should be base64 encoded
        assert len(data["data"]["content"]) > 0

    @pytest.mark.asyncio
    async def test_get_file_content_not_found(self):
        """Test getting content of non-existent file"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/content?path=/nonexistent/file.txt")

        # Should either return 404 (not found) or 403 (outside allowed paths)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_get_file_content_directory(self, temp_directory):
        """Test getting content of a directory instead of file"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/content?path={temp_directory}")

        assert response.status_code == 400
        assert "not a file" in response.json()["detail"].lower()


class TestFileSecurity:
    """Tests for file access security"""

    @pytest.mark.asyncio
    async def test_path_traversal_blocked(self, temp_directory):
        """Test that path traversal attempts are blocked"""
        # Attempt to escape temp_directory using ../
        traversal_path = os.path.join(temp_directory, "..", "..", "..", "etc", "passwd")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/content?path={traversal_path}")

        # Should be blocked - either 403 (forbidden) or 404 (not found within allowed paths)
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_path_traversal_tree_blocked(self, temp_directory):
        """Test that path traversal in tree endpoint is blocked"""
        traversal_path = os.path.join(temp_directory, "..", "..", "..", "etc")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/tree?path={traversal_path}")

        # Should be blocked
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_blocked_sensitive_file(self, temp_directory):
        """Test that sensitive files are blocked"""
        # Create a fake sensitive file
        sensitive_file = os.path.join(temp_directory, "credentials")
        with open(sensitive_file, "w") as f:
            f.write("secret")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/content?path={sensitive_file}")

        # Should be blocked as sensitive
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_file_too_large(self, temp_directory):
        """Test that files larger than MAX_FILE_SIZE are rejected"""
        large_file = os.path.join(temp_directory, "large.txt")
        # Create a file larger than 5MB
        with open(large_file, "w") as f:
            f.write("x" * (6 * 1024 * 1024))  # 6MB

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get(f"/api/files/content?path={large_file}")

        assert response.status_code == 413
        assert "too large" in response.json()["detail"].lower()

"""Tests for file download and upload endpoints"""
import pytest
from httpx import AsyncClient, ASGITransport
import os
import tempfile

from app.main import app


@pytest.fixture
def temp_directory():
    """Create a temporary directory with test files"""
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = os.path.join(tmpdir, "test.txt")
        with open(test_file, "w") as f:
            f.write("Hello World")

        test_py = os.path.join(tmpdir, "test.py")
        with open(test_py, "w") as f:
            f.write("print('hello')")

        yield tmpdir


class TestDownloadFile:
    """Tests for GET /api/files/download endpoint"""

    @pytest.mark.asyncio
    async def test_download_text_file(self, temp_directory):
        file_path = os.path.join(temp_directory, "test.txt")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/download", params={"path": file_path})

        assert response.status_code == 200
        assert response.content == b"Hello World"
        assert "text/plain" in response.headers["content-type"]
        assert "attachment" in response.headers.get("content-disposition", "")

    @pytest.mark.asyncio
    async def test_download_nonexistent_file(self, temp_directory):
        file_path = os.path.join(temp_directory, "nonexistent.txt")
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/download", params={"path": file_path})

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_download_blocked_file(self, temp_directory):
        file_path = os.path.join(temp_directory, "id_rsa")
        with open(file_path, "w") as f:
            f.write("secret key")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/download", params={"path": file_path})

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_download_path_traversal(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/download", params={"path": "/etc/shadow"})

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_download_directory_returns_error(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/download", params={"path": temp_directory})

        assert response.status_code == 400


    @pytest.mark.asyncio
    async def test_download_oversized_file(self, temp_directory):
        big_file = os.path.join(temp_directory, "big.txt")
        with open(big_file, "w") as f:
            f.write("x" * (1024 * 1024 * 6))  # 6MB > MAX_FILE_SIZE

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.get("/api/files/download", params={"path": big_file})

        assert response.status_code == 413


class TestUploadFile:
    """Tests for POST /api/files/upload endpoint"""

    @pytest.mark.asyncio
    async def test_upload_text_file(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("new_file.txt", b"new content", "text/plain")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert os.path.exists(os.path.join(temp_directory, "new_file.txt"))
        with open(os.path.join(temp_directory, "new_file.txt")) as f:
            assert f.read() == "new content"

    @pytest.mark.asyncio
    async def test_upload_file_already_exists(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("test.txt", b"overwrite", "text/plain")},
            )

        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_upload_file_overwrite(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory, "overwrite": True},
                files={"file": ("test.txt", b"overwritten", "text/plain")},
            )

        assert response.status_code == 200
        with open(os.path.join(temp_directory, "test.txt")) as f:
            assert f.read() == "overwritten"

    @pytest.mark.asyncio
    async def test_upload_blocked_extension(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("malware.exe", b"bad stuff", "application/octet-stream")},
            )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_upload_to_nonexistent_directory(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": "/tmp/nonexistent_dir_12345"},
                files={"file": ("test.txt", b"content", "text/plain")},
            )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_upload_to_readonly_directory(self):
        """Upload to a directory without write permission returns 500"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": "/etc"},
                files={"file": ("test.txt", b"content", "text/plain")},
            )

        assert response.status_code == 500

    @pytest.mark.asyncio
    async def test_upload_blocked_filename(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("id_rsa", b"secret", "text/plain")},
            )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_upload_returns_file_path_and_size(self, temp_directory):
        content = b"test content 123"
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("result.txt", content, "text/plain")},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["data"]["size"] == len(content)
        assert data["data"]["path"] == "result.txt"

    @pytest.mark.asyncio
    async def test_upload_path_traversal_in_filename_sanitized(self, temp_directory):
        """Filename with ../ is sanitized to basename — file is saved safely"""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("../../etc/evil.txt", b"safe", "text/plain")},
            )

        assert response.status_code == 200
        # File saved with sanitized name, not in ../../etc/
        assert os.path.exists(os.path.join(temp_directory, "evil.txt"))
        assert not os.path.exists("/etc/evil.txt")

    @pytest.mark.asyncio
    async def test_upload_absolute_path_filename(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("/etc/passwd", b"bad", "text/plain")},
            )

        # basename("/../etc/passwd") = "passwd" which is in BLOCKED_FILES
        assert response.status_code in (400, 403)

    @pytest.mark.asyncio
    async def test_upload_extensionless_file_rejected(self, temp_directory):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/files/upload",
                params={"directory": temp_directory},
                files={"file": ("somebinary", b"binary content", "application/octet-stream")},
            )

        assert response.status_code == 403

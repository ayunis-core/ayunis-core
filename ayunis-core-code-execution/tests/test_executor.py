"""Tests for PythonExecutor image handling.

These use a mocked docker client so they need neither a real Docker daemon nor
the sandbox image. They focus on the invariant introduced for AYC-600: the
sandbox tag is runtime-mutable, so the execution path must tolerate the image
being deleted after the service has started.
"""

from unittest.mock import MagicMock, patch

import docker
import pytest

from executor import PythonExecutor
from models import ExecutionRequest, ExecutorConfig


def _make_executor(client: MagicMock) -> PythonExecutor:
    """Construct an executor against a mocked docker client (image present)."""
    client.images.get.return_value = object()
    with patch("docker.from_env", return_value=client):
        return PythonExecutor(ExecutorConfig(docker_image="python-sandbox:latest"))


def test_ensure_sandbox_image_present_does_not_pull() -> None:
    client = MagicMock()
    executor = _make_executor(client)
    client.images.pull.reset_mock()

    executor._ensure_sandbox_image()

    client.images.pull.assert_not_called()


def test_ensure_sandbox_image_pulls_when_missing() -> None:
    client = MagicMock()
    executor = _make_executor(client)
    client.images.get.side_effect = docker.errors.ImageNotFound("missing")

    executor._ensure_sandbox_image()

    client.images.pull.assert_called_once_with("python-sandbox:latest")


def test_ensure_sandbox_image_raises_when_pull_fails() -> None:
    client = MagicMock()
    executor = _make_executor(client)
    client.images.get.side_effect = docker.errors.ImageNotFound("missing")
    client.images.pull.side_effect = docker.errors.APIError("registry down")

    with pytest.raises(RuntimeError):
        executor._ensure_sandbox_image()


@pytest.mark.asyncio
async def test_execute_repulls_when_image_deleted_after_construction() -> None:
    """The core AYC-600 regression: image is present at construction, then the
    tag is deleted before an execution. The execution must pull and succeed
    rather than fail with ImageNotFound."""
    client = MagicMock()
    executor = _make_executor(client)

    state = {"pulled": False}

    def images_get(image: str) -> object:
        if not state["pulled"]:
            raise docker.errors.ImageNotFound(f"{image} was deleted")
        return object()

    def images_pull(image: str) -> object:
        state["pulled"] = True
        return object()

    client.images.get.side_effect = images_get
    client.images.pull.side_effect = images_pull

    helper = MagicMock()
    sandbox = MagicMock()
    sandbox.wait.return_value = {"StatusCode": 0}
    sandbox.logs.side_effect = lambda stdout, stderr: b"hello\n" if stdout else b""
    sandbox.get_archive.side_effect = Exception("no output dir")

    def containers_create(image: str, **_kwargs: object) -> MagicMock:
        # Mirror docker-py: create has no implicit pull and fails hard when the
        # tag is absent. Only the per-execution re-ensure can save this path.
        if not state["pulled"]:
            raise docker.errors.ImageNotFound(f"{image} was deleted")
        return helper if client.containers.create.call_count == 1 else sandbox

    client.containers.create.side_effect = containers_create
    client.volumes.create.return_value = MagicMock()

    result = await executor.execute(ExecutionRequest(code="print('hello')", files={}))

    client.images.pull.assert_called_once_with("python-sandbox:latest")
    assert result.success is True
    assert result.exit_code == 0
    assert "hello" in result.output


@pytest.mark.asyncio
async def test_execute_fails_gracefully_when_image_unavailable() -> None:
    """When the image is gone and cannot be pulled, execute() returns a failed
    response instead of raising, keeping the service process alive."""
    client = MagicMock()
    executor = _make_executor(client)
    client.images.get.side_effect = docker.errors.ImageNotFound("gone")
    client.images.pull.side_effect = docker.errors.APIError("registry down")

    result = await executor.execute(ExecutionRequest(code="print('hello')", files={}))

    assert result.success is False
    assert result.exit_code == -1
    client.containers.create.assert_not_called()

"""Python code executor with Docker sandboxing."""

import asyncio
import base64
import docker
import io
import tarfile
import time
import uuid
from typing import Optional, Iterable, cast
import os
from models import ExecutionRequest, ExecutionResponse, ExecutorConfig


class PythonExecutor:
    """Executes Python code in isolated Docker containers."""

    def __init__(self, config: Optional[ExecutorConfig] = None):
        """Initialize the executor with configuration."""
        self.config = config or ExecutorConfig(
            execution_timeout=int(os.getenv("EXECUTION_TIMEOUT", "30")),
            max_memory=os.getenv("MAX_MEMORY", "512m"),
            max_cpu=float(os.getenv("MAX_CPU", "1.0")),
        )
        self.docker_client = docker.from_env()

        # Build the sandbox image on startup
        self._build_sandbox_image()

    def _build_sandbox_image(self):
        """Build the minimal sandbox image for code execution"""
        dockerfile_content = """
FROM python:3.12-slim
RUN useradd -m -u 1000 sandbox
WORKDIR /execution
RUN pip install --no-cache-dir numpy pandas matplotlib
RUN chown -R sandbox:sandbox /execution
USER sandbox
"""
        # Use fileobj instead of temporary file to avoid permission issues
        import io

        dockerfile_obj = io.BytesIO(dockerfile_content.encode("utf-8"))

        try:
            self.docker_client.images.build(
                fileobj=dockerfile_obj, tag=self.config.docker_image, rm=True
            )
        except Exception as e:
            # If building fails, try to use existing image or continue
            print(f"Warning: Could not build Docker image: {e}")
            print(f"Will attempt to use existing image: {self.config.docker_image}")
            # Check if image exists
            try:
                self.docker_client.images.get(self.config.docker_image)
                print(f"✅ Found existing image: {self.config.docker_image}")
            except:
                print(
                    f"❌ Image {self.config.docker_image} not found. Please build manually or use a different image."
                )

    async def execute(self, request: ExecutionRequest) -> ExecutionResponse:
        """
        Execute Python code in an isolated container

        Args:
            request: ExecutionRequest containing code and optional files

        Returns:
            ExecutionResponse with results
        """
        execution_id = str(uuid.uuid4())[:8]

        try:
            # Build in-memory tar archive with code, optional files, and output directory
            tar_stream = io.BytesIO()
            with tarfile.open(fileobj=tar_stream, mode="w") as tar:
                # main.py
                code_bytes = request.code.encode("utf-8")
                ti = tarfile.TarInfo(name="main.py")
                ti.size = len(code_bytes)
                ti.mtime = int(time.time())
                ti.mode = 0o644
                ti.uid = 1000
                ti.gid = 1000
                tar.addfile(ti, io.BytesIO(code_bytes))

                # files/ directory and its contents
                files_dir_info = tarfile.TarInfo(name="files")
                files_dir_info.type = tarfile.DIRTYPE
                files_dir_info.mode = 0o775
                files_dir_info.mtime = int(time.time())
                files_dir_info.uid = 1000
                files_dir_info.gid = 1000
                tar.addfile(files_dir_info)

                if request.files:
                    for filename, content_b64 in request.files.items():
                        try:
                            content = base64.b64decode(content_b64)
                        except Exception:
                            content = b""
                        fi = tarfile.TarInfo(name=f"files/{filename}")
                        fi.size = len(content)
                        fi.mtime = int(time.time())
                        fi.mode = 0o644
                        fi.uid = 1000
                        fi.gid = 1000
                        tar.addfile(fi, io.BytesIO(content))

                # output/ directory (empty)
                output_dir_info = tarfile.TarInfo(name="output")
                output_dir_info.type = tarfile.DIRTYPE
                output_dir_info.mode = 0o777
                output_dir_info.mtime = int(time.time())
                output_dir_info.uid = 1000
                output_dir_info.gid = 1000
                tar.addfile(output_dir_info)

                # Writable cache/config dirs to avoid writes to read-only rootfs
                for dir_name in [
                    ".cache",
                    ".config",
                    ".config/matplotlib",
                    "__pycache__",
                ]:
                    d = tarfile.TarInfo(name=dir_name)
                    d.type = tarfile.DIRTYPE
                    d.mode = 0o777
                    d.mtime = int(time.time())
                    d.uid = 1000
                    d.gid = 1000
                    tar.addfile(d)

            tar_stream.seek(0)

            # Per-execution ephemeral volume workflow (authoritative path)
            vol_name = f"exec-vol-{execution_id}"
            volume = self.docker_client.volumes.create(name=vol_name)  # type: ignore
            try:
                # Populate the volume using a short-lived helper container
                helper = self.docker_client.containers.create(  # type: ignore
                    self.config.docker_image,
                    command="sleep infinity",
                    name=f"exec-prep-{execution_id}",
                    user="root",
                    volumes={vol_name: {"bind": "/mnt", "mode": "rw"}},
                    network_disabled=True,
                    mem_limit="128m",
                    nano_cpus=int(self.config.max_cpu * 1e8),
                    read_only=False,
                    tmpfs={"/tmp": "size=50M"},
                    security_opt=["no-new-privileges"],
                    cap_drop=["ALL"],
                    pids_limit=30,
                    auto_remove=False,
                )
                try:
                    helper.start()  # type: ignore
                    helper.exec_run(["sh", "-lc", "mkdir -p /mnt/files /mnt/output && chown -R 1000:1000 /mnt"])  # type: ignore
                    # Upload prepared tar into the volume root
                    helper.put_archive(path="/mnt", data=tar_stream.getvalue())  # type: ignore
                    helper.exec_run(["sh", "-lc", "chown -R 1000:1000 /mnt"])  # type: ignore
                finally:
                    try:
                        helper.remove(force=True)  # type: ignore
                    except Exception:
                        pass

                # Run sandbox container with the volume mounted at /execution
                sandbox = self.docker_client.containers.create(  # type: ignore
                    self.config.docker_image,
                    command="python /execution/main.py",
                    name=f"exec-{execution_id}",
                    volumes={vol_name: {"bind": "/execution", "mode": "rw"}},
                    working_dir="/",
                    network_disabled=True,
                    mem_limit=self.config.max_memory,
                    nano_cpus=int(self.config.max_cpu * 1e9),
                    read_only=True,
                    tmpfs={"/tmp": "size=100M"},
                    environment={
                        "HOME": "/execution",
                        "XDG_CACHE_HOME": "/execution/.cache",
                        "XDG_CONFIG_HOME": "/execution/.config",
                        "MPLCONFIGDIR": "/execution/.config/matplotlib",
                        "PYTHONPYCACHEPREFIX": "/execution/__pycache__",
                        "MPLBACKEND": "Agg",
                    },
                    security_opt=["no-new-privileges"],
                    cap_drop=["ALL"],
                    pids_limit=50,
                    auto_remove=False,
                )
                try:
                    sandbox.start()  # type: ignore
                    result = sandbox.wait(timeout=self.config.execution_timeout)  # type: ignore
                    stdout_bytes: bytes = cast(bytes, sandbox.logs(stdout=True, stderr=False))  # type: ignore
                    stderr_bytes: bytes = cast(bytes, sandbox.logs(stdout=False, stderr=True))  # type: ignore
                    stdout: str = (stdout_bytes or b"").decode("utf-8")
                    stderr: str = (stderr_bytes or b"").decode("utf-8")

                    # Collect outputs from mounted volume
                    output_files: dict[str, str] = {}
                    try:
                        stream, _ = sandbox.get_archive("/execution/output")  # type: ignore
                        archive_bytes: bytes = b"".join(cast(Iterable[bytes], stream))
                        with tarfile.open(
                            fileobj=io.BytesIO(archive_bytes), mode="r:"
                        ) as tar:
                            for member in tar.getmembers():
                                if member.isfile() and member.name.endswith(".csv"):
                                    f = tar.extractfile(member)
                                    if f is None:
                                        continue
                                    content = f.read()
                                    output_files[os.path.basename(member.name)] = (
                                        base64.b64encode(content).decode("utf-8")
                                    )
                    except Exception as e:
                        print(f"Warning: Could not retrieve output files: {e}")

                    return ExecutionResponse(
                        success=result.get("StatusCode", 1) == 0,  # type: ignore
                        output=stdout,
                        error=stderr,
                        exit_code=result.get("StatusCode", 1),  # type: ignore
                        execution_id=execution_id,
                        output_files=output_files if output_files else None,
                    )
                finally:
                    try:
                        sandbox.remove(force=True)  # type: ignore
                    except Exception:
                        pass
            finally:
                try:
                    volume.remove(force=True)  # type: ignore
                except Exception:
                    pass

        except Exception as e:
            return ExecutionResponse(
                success=False,
                output="",
                error=str(e),
                exit_code=-1,
                execution_id=execution_id,
                output_files=None,
            )


async def main():
    """Demo main function for testing the executor."""
    executor = PythonExecutor()

    # Test execution
    test_request = ExecutionRequest(
        code="print('Hello from Python executor!')", files={}
    )
    result = await executor.execute(test_request)

    print(f"Execution result: {result}")


if __name__ == "__main__":
    asyncio.run(main())

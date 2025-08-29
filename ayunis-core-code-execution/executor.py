"""Python code executor with Docker sandboxing."""
import asyncio
import base64
import docker
from docker.errors import APIError
import tempfile
import uuid
from pathlib import Path
from typing import Optional
import os
from models import ExecutionRequest, ExecutionResponse, ExecutorConfig

class PythonExecutor:
    """Executes Python code in isolated Docker containers."""
    
    def __init__(self, config: Optional[ExecutorConfig] = None):
        """Initialize the executor with configuration."""
        self.config = config or ExecutorConfig(
            execution_timeout=int(os.getenv('EXECUTION_TIMEOUT', '30')),
            max_memory=os.getenv('MAX_MEMORY', '512m'),
            max_cpu=float(os.getenv('MAX_CPU', '1.0')),
        )
        self.docker_client = docker.from_env()
        
        # Build the sandbox image on startup
        self._build_sandbox_image()
        
    def _build_sandbox_image(self):
        """Build the minimal sandbox image for code execution"""
        dockerfile_content = '''
FROM python:3.12-slim
RUN useradd -m -u 1000 sandbox
WORKDIR /execution
RUN pip install --no-cache-dir numpy pandas matplotlib
USER sandbox
'''
        # Use fileobj instead of temporary file to avoid permission issues
        import io
        dockerfile_obj = io.BytesIO(dockerfile_content.encode('utf-8'))
        
        try:
            self.docker_client.images.build(
                fileobj=dockerfile_obj,
                tag=self.config.docker_image,
                rm=True
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
                print(f"❌ Image {self.config.docker_image} not found. Please build manually or use a different image.")
    
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
            # Create temporary directory for this execution
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Write code to file
                code_file = temp_path / 'main.py'
                code_file.write_text(request.code)
                
                # Write additional files if provided
                files_dir = temp_path / 'files'
                if request.files:
                    files_dir.mkdir()
                    for filename, content_b64 in request.files.items():
                        content = base64.b64decode(content_b64)
                        (files_dir / filename).write_bytes(content)
                else:
                    files_dir.mkdir()  # Create empty directory for consistent volume mounting
                
                # Create and run container
                container = self.docker_client.containers.run(
                    self.config.docker_image,
                    command='python /execution/main.py',
                    detach=True,
                    name=f'exec-{execution_id}',
                    
                    # Mount code and files
                    volumes={
                        str(code_file): {'bind': '/execution/main.py', 'mode': 'ro'},
                        str(files_dir): {
                            'bind': '/execution/files', 
                            'mode': 'ro'
                        }
                    },
                    
                    # Security settings
                    network_disabled=True,  # No network access
                    mem_limit=self.config.max_memory,
                    nano_cpus=int(self.config.max_cpu * 1e9),
                    read_only=True,
                    tmpfs={'/tmp': 'size=100M'},
                    
                    # Security options
                    security_opt=['no-new-privileges'],
                    cap_drop=['ALL'],
                    pids_limit=50,
                    
                    # Ensure cleanup
                    auto_remove=False
                )
                
                # Wait for completion with timeout
                try:
                    result = container.wait(timeout=self.config.execution_timeout)
                    
                    # Split stdout and stderr
                    stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
                    stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
                    
                    return ExecutionResponse(
                        success=result['StatusCode'] == 0,
                        output=stdout,
                        error=stderr,
                        exit_code=result['StatusCode'],
                        execution_id=execution_id
                    )
                    
                except APIError as e:
                    # Timeout or other Docker API error
                    container.stop(timeout=1)
                    return ExecutionResponse(
                        success=False,
                        output='',
                        error=f'Execution timeout ({self.config.execution_timeout}s)',
                        exit_code=-1,
                        execution_id=execution_id
                    )
                finally:
                    # Ensure container is removed
                    try:
                        container.remove(force=True)
                    except:
                        pass
                        
        except Exception as e:
            return ExecutionResponse(
                success=False,
                output='',
                error=str(e),
                exit_code=-1,
                execution_id=execution_id
            )




async def main():
    """Demo main function for testing the executor."""
    executor = PythonExecutor()
    
    # Test execution
    test_request = ExecutionRequest(code="print('Hello from Python executor!')", files={})
    result = await executor.execute(test_request)
    
    print(f"Execution result: {result}")

if __name__ == '__main__':
    asyncio.run(main())
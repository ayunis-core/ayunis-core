"""Pydantic models for the Python code execution service."""
from typing import Dict, Optional
from pydantic import BaseModel, Field


class ExecutionRequest(BaseModel):
    """Request model for code execution."""
    code: str = Field(..., description="Python code to execute")
    files: Optional[Dict[str, str]] = Field(
        None, 
        description="Optional dictionary of filename -> base64-encoded content"
    )


class ExecutionResponse(BaseModel):
    """Response model for code execution results."""
    success: bool = Field(..., description="Whether the execution completed successfully")
    output: str = Field(default="", description="Standard output from the execution")
    error: str = Field(default="", description="Standard error from the execution")
    exit_code: int = Field(..., description="Exit code from the execution")
    execution_id: str = Field(..., description="Unique identifier for this execution")


class ExecutorConfig(BaseModel):
    """Configuration model for the Python executor."""
    execution_timeout: int = Field(default=30, description="Maximum execution time in seconds")
    max_memory: str = Field(default="512m", description="Maximum memory limit for containers")
    max_cpu: float = Field(default=1.0, description="Maximum CPU limit for containers")
    docker_image: str = Field(default="python-sandbox:latest", description="Docker image to use")


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service status")
    message: str = Field(default="", description="Additional status information")

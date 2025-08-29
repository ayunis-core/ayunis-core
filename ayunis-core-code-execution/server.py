"""FastAPI server for Python code execution service."""
import logging
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import ExecutionRequest, ExecutionResponse, HealthResponse

if TYPE_CHECKING:
    from executor import PythonExecutor

logger = logging.getLogger(__name__)

# Global executor instance (will be set during startup)
executor_instance: Optional['PythonExecutor'] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown."""
    logger.info("Starting up Python executor service...")
    # Startup logic here if needed
    yield
    # Cleanup logic here if needed
    logger.info("Shutting down Python executor service...")


# Create FastAPI app
app = FastAPI(
    title="Ayunis Code Execution Service",
    description="A secure Python code execution service with Docker sandboxing",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure as needed for production
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def set_executor(executor: 'PythonExecutor') -> None:
    """Set the global executor instance."""
    global executor_instance
    executor_instance = executor


@app.post("/execute", response_model=ExecutionResponse)
async def execute_code(request: ExecutionRequest) -> ExecutionResponse:
    """Execute Python code in a sandboxed container."""
    if executor_instance is None:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    try:
        logger.info("Executing code request")
        result = await executor_instance.execute(request)
        logger.info(f"Code execution completed: {result.execution_id}")
        return result
    except Exception as e:
        logger.error(f"Code execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check service health status."""
    try:
        if executor_instance is None:
            return HealthResponse(
                status="unhealthy",
                message="Executor not initialized"
            )
        
        return HealthResponse(
            status="healthy",
            message="Python executor service is running"
        )
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return HealthResponse(
            status="unhealthy", 
            message=str(e)
        )


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Ayunis Code Execution Service",
        "version": "0.1.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


class ExecutorAPI:
    """Compatibility wrapper for FastAPI app."""
    
    def __init__(self, executor: 'PythonExecutor'):
        """Initialize with executor instance."""
        set_executor(executor)
        self.app = app
    
    async def run(self, host: str = '0.0.0.0', port: int = 8080) -> None:
        """Run the FastAPI server using uvicorn."""
        import uvicorn
        
        logger.info(f"Starting FastAPI server on {host}:{port}")
        config = uvicorn.Config(
            app=self.app,
            host=host,
            port=port,
            log_level="info"
        )
        server = uvicorn.Server(config)
        await server.serve()
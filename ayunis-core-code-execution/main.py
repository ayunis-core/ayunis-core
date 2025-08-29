#!/usr/bin/env python3
"""Main entry point for the Python code execution service."""
import asyncio
import logging
import os
import sys

from executor import PythonExecutor
from server import ExecutorAPI
from models import ExecutorConfig


def setup_logging() -> None:
    """Set up logging configuration."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )


def create_executor_config() -> ExecutorConfig:
    """Create executor configuration from environment variables."""
    return ExecutorConfig(
        execution_timeout=int(os.getenv('EXECUTION_TIMEOUT', '30')),
        max_memory=os.getenv('MAX_MEMORY', '512m'),
        max_cpu=float(os.getenv('MAX_CPU', '1.0')),
        docker_image=os.getenv('DOCKER_IMAGE', 'python-sandbox:latest')
    )


async def main() -> None:
    """Main application entry point."""
    setup_logging()
    logger = logging.getLogger(__name__)
    
    try:
        # Create configuration
        config = create_executor_config()
        logger.info(f"Starting with config: {config}")
        
        # Create executor
        executor = PythonExecutor(config)
        logger.info("Python executor initialized")
        
        # Create and start API server
        api = ExecutorAPI(executor)
        host = os.getenv('HOST', '0.0.0.0')
        port = int(os.getenv('PORT', '8080'))
        
        logger.info(f"Starting API server on {host}:{port}")
        await api.run(host=host, port=port)
        
    except KeyboardInterrupt:
        logger.info("Shutting down gracefully...")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutdown complete.")
        sys.exit(0)

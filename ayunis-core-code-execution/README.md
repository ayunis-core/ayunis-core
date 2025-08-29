# Ayunis Code Execution Service

A secure Python code execution service that runs user code in isolated Docker containers.

## Features

- **Secure Execution**: Code runs in isolated Docker containers with limited resources
- **Type Safety**: Built with Pydantic models for request/response validation
- **HTTP API**: Simple REST API for code execution
- **Resource Limits**: Configurable CPU, memory, and timeout limits
- **Health Monitoring**: Built-in health check endpoint

## Quick Start

1. **Install dependencies**:

   ```bash
   pip install -e .
   ```

2. **Make sure Docker is running** on your system.

3. **Start the service**:

   ```bash
   python main.py
   ```

4. **Test the API**:
   ```bash
   curl -X POST http://localhost:8080/execute \
     -H "Content-Type: application/json" \
     -d '{"code": "print(\"Hello, World!\")"}'
   ```

## API Endpoints

### POST /execute

Execute Python code in a sandboxed container.

**Request**:

```json
{
  "code": "print('Hello, World!')",
  "files": {
    "data.txt": "SGVsbG8gV29ybGQ=" // base64 encoded
  }
}
```

**Response**:

```json
{
  "success": true,
  "output": "Hello, World!\n",
  "error": "",
  "exit_code": 0,
  "execution_id": "abc12345"
}
```

### GET /health

Check service health status.

**Response**:

```json
{
  "status": "healthy",
  "message": "Python executor service is running"
}
```

## Configuration

Configure the service using environment variables:

- `EXECUTION_TIMEOUT`: Maximum execution time in seconds (default: 30)
- `MAX_MEMORY`: Maximum memory limit (default: 512m)
- `MAX_CPU`: Maximum CPU limit (default: 1.0)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8080)
- `DOCKER_IMAGE`: Docker image for sandboxing (default: python-sandbox:latest)

## Development

1. **Install development dependencies**:

   ```bash
   pip install -e ".[dev]"
   ```

2. **Run type checking**:

   ```bash
   mypy .
   ```

3. **Format code**:

   ```bash
   black .
   ```

4. **Run linting**:
   ```bash
   flake8 .
   ```

## Security

- Code execution is isolated in Docker containers
- Network access is disabled for executed code
- Resource limits prevent resource exhaustion
- Containers run as non-root user
- Temporary files are automatically cleaned up

## License

MIT License - see LICENSE file for details.

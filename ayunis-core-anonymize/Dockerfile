FROM python:3.11-slim

WORKDIR /app

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files first for better caching
COPY pyproject.toml uv.lock ./

# Install dependencies
RUN uv sync --frozen --no-dev

# Pre-cache the GLiNER model files (download only, don't load into memory)
ENV HF_HOME=/root/.cache/huggingface
RUN uv run python -c "from huggingface_hub import snapshot_download; snapshot_download('urchade/gliner_multi_pii-v1')"

# Copy application code
COPY . .

# Expose the service port
EXPOSE 8000

# Run the application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

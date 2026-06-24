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

# Copy application code, then re-sync so the project install reflects the
# actual source (otherwise `uv run` does this on every container start and
# restarts uvicorn mid-boot, blowing past the healthcheck window).
COPY . .
RUN uv sync --frozen --no-dev

# Expose the service port
EXPOSE 8000

# --no-sync skips the implicit sync uv would otherwise run on every container
# start; the venv is already complete from the build step above.
CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

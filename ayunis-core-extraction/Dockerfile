FROM python:3.11-slim

WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Word lists for the per-page OCR rule (contract §8.1). Debian ships igerman98
# (GPL-2.0-or-later / GPL-3.0) and SCOWL (permissive) as data files under
# /usr/share/hunspell; they are read at runtime, never linked.
RUN apt-get update \
    && apt-get install -y --no-install-recommends hunspell-de-de hunspell-en-us \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Re-sync after copying the source so `uv run` does not do it on every container
# start and restart uvicorn mid-boot (same reasoning as ayunis-core-anonymize).
COPY . .
RUN uv sync --frozen --no-dev

ENV SCRATCH_DIR=/scratch
RUN mkdir -p /scratch

EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--timeout-graceful-shutdown", "30"]

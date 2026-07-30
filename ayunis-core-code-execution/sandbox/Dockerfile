# Sandbox image for user code execution. Previously built inline at service
# startup by executor.py (unpinned); now a committed Dockerfile so the image
# is versioned, pinned, published to GHCR, and bumped by Dependabot.
#
# Dev: built as python-sandbox:latest by ./dev (or manually:
#   docker build -t python-sandbox:latest ayunis-core-code-execution/sandbox).
# Prod: published as ghcr.io/ayunis-core/ayunis-core-python-sandbox and
# referenced via the code-execution service's DOCKER_IMAGE env var.
FROM python:3.12-slim

RUN useradd -m -u 1000 sandbox
WORKDIR /execution
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt
RUN chown -R sandbox:sandbox /execution
USER sandbox

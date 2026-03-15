FROM python:3.14-slim

# Install Docker CLI and curl (for building sandbox images and health checks)
RUN apt-get update && \
    apt-get install -y \
    docker.io \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 ayunis

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure correct ownership
RUN chown -R ayunis:ayunis /app

# Switch to non-root user (safe when using docker-socket-proxy)
USER ayunis

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Run the application
CMD ["python", "main.py"]

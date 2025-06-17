#!/bin/sh
set -e

# Print message with timestamp
log() {
  echo "$(date -u +"%Y-%m-%d %H:%M:%S") - $1"
}

log "Starting development environment setup..."

# Check if node_modules is empty and install dependencies if needed
if [ -z "$(ls -A /app/node_modules 2>/dev/null)" ]; then
  log "Node modules not found. Installing dependencies..."
  npm install
else
  log "Node modules found. Checking for package.json changes..."
  
  # Check if package.json has changed since last install
  if [ -f /app/node_modules/.package.json.md5 ]; then
    OLD_MD5=$(cat /app/node_modules/.package.json.md5)
    NEW_MD5=$(md5sum /app/package.json | awk '{print $1}')
    
    if [ "$OLD_MD5" != "$NEW_MD5" ]; then
      log "Package.json has changed. Updating dependencies..."
      npm install
      echo "$NEW_MD5" > /app/node_modules/.package.json.md5
    else
      log "No changes in package.json. Using existing dependencies."
    fi
  else
    log "No previous package.json hash found. Installing dependencies..."
    npm install
    md5sum /app/package.json | awk '{print $1}' > /app/node_modules/.package.json.md5
  fi
fi

log "Setup complete. Starting application..."

# Execute the command passed to the script
exec "$@" 
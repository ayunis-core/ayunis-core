/**
 * Preload script for -r flag usage (e.g. ts-node -r src/config/env-register).
 * Loads .env.dev (if present) then .env, so dev overrides take precedence.
 */
// quiet: true suppresses dotenv v17's promotional console output.
require('dotenv').config({ path: '.env.dev', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

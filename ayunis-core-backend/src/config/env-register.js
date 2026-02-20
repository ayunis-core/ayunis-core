/**
 * Preload script for -r flag usage (e.g. ts-node -r src/config/env-register).
 * Loads .env.dev (if present) then .env, so dev overrides take precedence.
 */
// quiet: true suppresses the dotenv v17 promotional console message.
require('dotenv').config({ path: '.env.dev', quiet: true });
require('dotenv').config({ path: '.env', quiet: true });

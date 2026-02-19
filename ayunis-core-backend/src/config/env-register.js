/**
 * Preload script for -r flag usage (e.g. ts-node -r src/config/env-register).
 * Loads .env.dev (if present) then .env, so dev overrides take precedence.
 */
// dotenv 16.x only accepts a string for `path` (array support is v17.1+).
require('dotenv').config({ path: '.env.dev' });
require('dotenv').config({ path: '.env' });

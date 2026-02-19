/**
 * Preload script for -r flag usage (e.g. ts-node -r src/config/env-register).
 * Loads .env.dev (if present) then .env, so dev overrides take precedence.
 * Uses two sequential calls because dotenv won't overwrite vars already set.
 */
require('dotenv').config({ path: '.env.dev' });
require('dotenv').config({ path: '.env' });

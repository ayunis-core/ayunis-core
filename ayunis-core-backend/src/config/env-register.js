/**
 * Preload script for -r flag usage (e.g. ts-node -r src/config/env-register).
 * Loads .env.dev (if present) then .env, so dev overrides take precedence.
 */
require('dotenv').config({ path: ['.env.dev', '.env'] });

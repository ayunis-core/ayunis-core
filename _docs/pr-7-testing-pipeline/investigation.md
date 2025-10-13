# PR #7: Testing Pipeline & E2E Tests - Requirements

**PR Link:** https://github.com/ayunis-core/ayunis-core/pull/7
**Author:** @mschluer
**Status:** In Progress - Addressing Remaining Blockers
**Last Updated:** 2025-10-13 (Updated after pulling latest changes)

## Overview

This PR introduces comprehensive E2E testing infrastructure with:
- Cypress-based UI tests with Page Object pattern
- CLI tool for seeding test data
- **Mock inference handlers - eliminates dependency on real LLM providers**
- GitHub Actions pipeline for automated testing
- Docker test environment configuration

**Key Design Decision:** The testing pipeline is intentionally designed to be **completely independent of external LLM APIs**. Mock inference handlers provide predictable responses without requiring API keys or making external calls. This ensures:
- Tests are fast and reliable
- No API costs during testing
- No quota/rate limit concerns
- Tests work offline
- Predictable, deterministic test results

## Completed Components

### ✅ E2E Test Infrastructure
- **Location:** `ayunis-core-e2e-ui-tests/`
- Cypress test framework configured (`cypress.config.ts`)
- Page Object pattern implemented for maintainability
- Test IDs (`data-testid`) added to frontend components
- Representative test cases written:
  - `chat-lifecycle.cy.ts` - Chat creation, renaming, deletion
  - Model selection and verification tests

### ✅ CLI Seeding Tool
- **Location:** `ayunis-core-backend/src/cli/`
- CLI module created using nest-commander
- Commands implemented:
  - `seed:minimal` - Creates minimal test data (seed-minimal.command.ts:22)
  - `seed:users` - User-only seeding
  - `seed:models` - Model-only seeding
- NPM scripts added:
  - `npm run seed` - For built application
  - `npm run seed:ts` - For TypeScript application

### ✅ Mock Inference Handlers (CRITICAL COMPONENT)
- **Location:** `ayunis-core-backend/src/domain/models/infrastructure/`
- **Purpose:** Eliminate dependency on real LLM provider APIs
- `mock.inference.ts` - Returns `{provider}::{model}` format immediately
- `mock.stream-inference.ts` - Streaming mock responses
- Registered in models module when `APP_ENVIRONMENT=test`
- **No API keys needed** - Tests run completely offline

### ✅ Documentation Fix
- Fixed incorrect admin endpoint in README.md
- Changed from `/api/admin/models` to `/api/admin/language-models`

### ✅ Test Environment Configuration
- **docker-compose.test.yml** - Complete test environment with postgres, minio, and app
- **Dockerfile.test** - Multi-stage build with NODE_ENV=test
- **.env.test files** - Test environment variables for both backend and frontend
- Container names prefixed with `-test` for isolation
- Health checks configured for all services

### ✅ Test Data Alignment (RESOLVED)
- Test credentials now match seed data: `admin@demo.local` / `admin` (E2eTest01.account.ts:2-4)
- Model name aligned: Tests expect `GPT-4o mini` (chat-lifecycle.cy.ts:12, 23)
- Login command updated to accept password directly (commands.ts:4)
- Cypress config no longer requires TEST_USER_PASSWORD env var (cypress.config.ts:9)

### ✅ Workflow Pipeline Updated (RESOLVED)
- Now uses dedicated `docker-compose.test.yml` (.github/workflows/e2e-ui-tests.yml:14)
- Seeding step added after container startup (line 16-17)
- Simplified pipeline - no separate frontend/backend startup needed
- TODO comment removed - seeding handles model creation

## Remaining Blockers ⚠️

### 1. Seeding Exits with Code 137 🔴 CRITICAL
**Status:** Active Investigation Required
**Issue:** Docker container running seed command is killed with exit code 137
**Likely Cause:** Out of Memory (OOM) or signal termination
**Files Involved:**
- `Dockerfile.test:48` - `npm ci --only=production && npm rebuild bcrypt`
- `docker-compose.test.yml:49` - Container: ayunis-app-test
- `ayunis-core-backend/src/cli/application/commands/seed-minimal.command.ts`

**Investigation Steps:**
1. Check Docker container memory limits (no explicit limit set in compose file)
2. Verify bcrypt rebuild doesn't cause excessive memory usage
3. Ensure NestJS application shuts down properly after CLI command completes
4. Check if database connections are properly closed
5. Test seeding locally with `docker compose -f docker-compose.test.yml up -d && docker exec ayunis-app-test npm run seed`

**Possible Solutions:**
- Add memory limits to docker-compose.test.yml
- Ensure CLI properly calls `app.close()` after seeding
- Add `NODE_OPTIONS=--max-old-space-size=512` to limit memory usage
- Skip bcrypt rebuild if not needed in test environment

### 2. Mock Inference Handlers May Not Be Working 🟡 NEEDS VERIFICATION
**Status:** Needs Testing
**Issue:** Need to verify mock providers return responses without calling real LLM APIs
**Impact:** Chat tests may wait indefinitely if mocks don't respond OR tests may attempt to call real APIs (which should never happen)
**Files Involved:**
- `ayunis-core-backend/src/domain/models/infrastructure/inference/mock.inference.ts`
- `ayunis-core-backend/src/domain/models/infrastructure/stream-inference/mock.stream-inference.ts`
- `ayunis-core-backend/src/domain/models/models.module.ts`
- `.env.test:4` - `APP_ENVIRONMENT=test`

**Critical Verification Steps:**
1. **Confirm mocks are registered** when `APP_ENVIRONMENT=test`
2. **Verify NO real API calls are made** - tests must be completely self-contained
3. Test that mock returns `openai::gpt-4o-mini` for seeded model
4. Verify streaming mock works with SSE/WebSocket
5. Check that tests receive responses within timeout
6. Review models.module.ts to ensure conditional mock registration
7. **Ensure empty API keys in .env.test don't cause errors**

**Expected Behavior:**
- Mock returns `{provider}::{model}` format immediately (mock.inference.ts:16)
- **Zero external network calls to LLM providers**
- Tests complete successfully with empty API keys

## GitHub Configuration Requirements

### Required Secrets

**IMPORTANT:** No LLM provider API keys are required or should be configured.

The test environment uses **mock inference handlers** that provide deterministic responses without making external API calls. This is by design to ensure:
- Tests don't depend on external services
- No API costs during CI/CD
- Fast, reliable test execution
- Tests work in any environment

```
# NO SECRETS NEEDED FOR TESTING
# The following are NOT required and should NOT be configured:
# ❌ MISTRAL_API_KEY
# ❌ OPENAI_API_KEY
# ❌ ANTHROPIC_API_KEY
# ❌ OLLAMA_BASE_URL
```

The `.env.test` file includes these variables but they are left empty (`.env.test:51-54`). The mock handlers are activated when `APP_ENVIRONMENT=test` and bypass all real API calls.

### Environment Variables for Tests
- `CYPRESS_BASE_URL` - Defaults to http://localhost:3000 (cypress.config.ts:5)
- ~~`TEST_USER_PASSWORD`~~ - No longer required (removed from cypress.config.ts:9)

## Workflow Pipeline Steps

Current pipeline (`.github/workflows/e2e-ui-tests.yml`) - UPDATED & SIMPLIFIED:

1. **Checkout code** - actions/checkout@v4 (line 11)
2. **Start Containers** - `docker compose -f docker-compose.test.yml up -d` (line 14)
   - Starts postgres, minio, and app containers
   - Waits for health checks to pass
3. **Seed Database** - `docker exec ayunis-app-test npm run seed` (line 17)
   - Creates org, admin user, and gpt-4o-mini model
   - **This is where exit code 137 occurs**
4. **Setup Node** - Node.js 20 with npm caching (line 19-23)
5. **Run Cypress Tests** - Chrome browser, headless (line 24-26)
6. **Upload artifacts** - Screenshots & videos on failure (line 28-35)

**Changes from original:**
- ✅ Removed separate backend/frontend startup steps
- ✅ Removed TODO comment about adding models
- ✅ Simplified to use docker-compose.test.yml exclusively
- ✅ Frontend is now served from app container, not separate dev server

## Tasks to Complete Before Merge

### Priority 1: Fix Critical Blocker
- [ ] **Debug and fix seeding exit code 137** 🔴 BLOCKING
  - Test locally: `docker compose -f docker-compose.test.yml up -d && docker exec ayunis-app-test npm run seed`
  - Check container logs: `docker logs ayunis-app-test`
  - Monitor memory: `docker stats ayunis-app-test`
  - Investigate CLI shutdown in src/cli/main.ts

### Priority 2: Verify Mock Handlers
- [ ] **Verify mock inference handlers work WITHOUT real API keys** 🟡 CRITICAL
  - Check models.module.ts registers mocks when APP_ENVIRONMENT=test
  - Confirm empty API keys in .env.test don't cause errors
  - Test API endpoint returns mock response (should be `openai::gpt-4o-mini`)
  - Verify streaming works with mock
  - **Verify NO external network calls are made to LLM providers**

### Priority 3: Testing & Verification
- [ ] Run full test suite locally
  - `docker compose -f docker-compose.test.yml up -d`
  - Wait for health checks
  - `docker exec ayunis-app-test npm run seed`
  - `cd ayunis-core-e2e-ui-tests && npx cypress run`
- [ ] Verify both chat lifecycle tests pass
- [ ] Check artifact upload on test failure
- [ ] Test in GitHub Actions once blockers resolved

### Priority 4: Documentation & Polish
- [ ] Update this document with findings from blocker investigation
- [ ] Document local testing procedure in README
- [ ] Add troubleshooting guide for common issues
- [ ] Address any Cursor-identified bugs

### ✅ Completed Tasks
- [x] Align test credentials with seed data
- [x] Resolve model name mismatch
- [x] Implement workflow seeding step
- [x] Create docker-compose.test.yml
- [x] Create Dockerfile.test with NODE_ENV=test
- [x] Add .env.test files
- [x] Simplify workflow pipeline
- [x] Update Cypress configuration

## Improvement Opportunities (Post-Merge)

From mschluer's review comments and team discussion:

1. **Data-driven seeding** - Load seed data from configuration files instead of hardcoding values
2. **Pipeline caching** - Cache Docker layers and npm dependencies to reduce build time
3. ~~**Separate test environment**~~ - ✅ DONE: Now uses docker-compose.test.yml
4. **Parameterized seeding** - Allow CLI commands to accept custom values via flags
5. **Seeding validation** - Add checks to verify seeded data exists before running tests
6. **Seed multiple models** - Add more models for comprehensive dropdown testing
7. **Memory optimization** - Review and optimize Docker container memory usage
8. **Health check tuning** - Adjust health check intervals and timeouts based on actual startup times
9. **Mock verification tests** - Add explicit tests that verify mocks are active and no real API calls are made
10. **Network isolation** - Consider using Docker network policies to block external API access during tests

## Test Data Specification

### Seeded Data (`seed:minimal`) ✅
```typescript
Organization: "Demo Org"
Admin User:
  - Email: admin@demo.local
  - Password: admin
  - Role: ADMIN
  - Name: Admin
  - Email Verified: true
Model:
  - Name: gpt-4o-mini
  - Display Name: GPT-4o mini
  - Provider: OpenAI (ModelProvider.OPENAI)
  - Can Stream: true
  - Is Reasoning: false
  - Is Archived: false
Permitted Provider:
  - Provider: OpenAI
  - Org: Demo Org
Permitted Model:
  - Model: gpt-4o-mini
  - Org: Demo Org
```

### Test Expectations ✅ ALIGNED
```typescript
Test User (E2eTest01.account.ts):
  - Email: admin@demo.local           ✅ Matches seed
  - Username: Admin                   ✅ Matches seed
  - Password: admin                   ✅ Matches seed
Expected Models:
  - GPT-4o mini                       ✅ Matches seed (chat-lifecycle.cy.ts:12, 23)
  - Additional models in dropdown     ℹ️ Only one model seeded currently
```

**Note:** The second test iterates over all available models. With only one model seeded, it will test that single model.

## References

- **PR Description:** https://github.com/ayunis-core/ayunis-core/pull/7
- **Key Files:**
  - Workflow: `.github/workflows/e2e-ui-tests.yml`
  - Seed Command: `ayunis-core-backend/src/cli/application/commands/seed-minimal.command.ts`
  - Mock Handler: `ayunis-core-backend/src/domain/models/infrastructure/inference/mock.inference.ts`
  - Test Suite: `ayunis-core-e2e-ui-tests/cypress/e2e/chat-lifecycle.cy.ts`
  - Cypress Config: `ayunis-core-e2e-ui-tests/cypress.config.ts`
- **Related Comments:**
  - mschluer's blocker list: https://github.com/ayunis-core/ayunis-core/pull/7#discussion_r...
  - devbydaniel's seeding explanation: https://github.com/ayunis-core/ayunis-core/pull/7#issuecomment-...

## Next Steps

### Immediate Actions
1. ✅ ~~Pull latest changes from PR #7 to local branch~~ - DONE
2. 🔴 **Investigate and fix seeding exit code 137** - IN PROGRESS
   - Run: `docker compose -f docker-compose.test.yml up -d`
   - Run: `docker exec ayunis-app-test npm run seed`
   - Check: `docker logs ayunis-app-test`
   - Monitor: `docker stats ayunis-app-test`
3. 🟡 **Test mock handlers functionality** - PENDING
   - Verify mock responses are returned
   - Check streaming works
4. ✅ ~~Align test data with seed data~~ - DONE
5. ✅ ~~Update workflow to seed models~~ - DONE

### Before Merge
6. Run full local test to validate everything works
7. Push to PR and verify GitHub Actions passes
8. Get final review approval
9. Merge to main

## Quick Test Commands

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Check container health
docker ps
docker logs ayunis-app-test
docker logs ayunis-postgres-test
docker logs ayunis-minio-test

# Verify environment is using mocks (check APP_ENVIRONMENT)
docker exec ayunis-app-test printenv | grep APP_ENVIRONMENT
# Should output: APP_ENVIRONMENT=test

# Verify no API keys are set (should be empty)
docker exec ayunis-app-test printenv | grep -E "(OPENAI|ANTHROPIC|MISTRAL)_API_KEY"

# Run seed (THIS IS WHERE IT FAILS)
docker exec ayunis-app-test npm run seed

# Monitor memory usage
docker stats ayunis-app-test

# Test mock inference (after seeding succeeds)
# This should return "openai::gpt-4o-mini" without calling real APIs
# TODO: Add actual curl command once we know the endpoint

# Run tests
cd ayunis-core-e2e-ui-tests
npm ci
npx cypress run

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

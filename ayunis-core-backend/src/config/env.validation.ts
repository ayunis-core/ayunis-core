import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  validateSync,
  type ValidationError,
} from 'class-validator';

const NODE_ENVS = ['development', 'production', 'test'] as const;
const BOOLEAN_STRINGS = ['true', 'false'] as const;

/**
 * The single source of truth for a valid backend environment (mirrors
 * .env.example). `validateEnv` runs at boot via ConfigModule.forRoot's
 * `validate` hook for every entrypoint that loads `rootConfigs` (AppModule,
 * CliModule), so a missing/invalid variable fails startup with one message
 * listing every problem — instead of silently falling back to a default
 * (masking a typo'd var) or crashing lazily deep in the DI graph.
 *
 * The requiredness rules previously scattered across config factories (the
 * auth JWT/COOKIE assert, the MinIO/Redis production asserts) are consolidated
 * here so validity lives in one place; the factories only read values.
 *
 * Optional variables are validated for shape *when present* — an empty/blank
 * value counts as unset (dotenv turns `FOO=` into `""`), matching the
 * `?? default` semantics the factories still use for their default values.
 */
export class EnvironmentVariables {
  // Runtime
  @IsOptional() @IsIn(NODE_ENVS) NODE_ENV?: string;
  @IsOptional() @IsIn(['self-hosted', 'cloud']) APP_ENVIRONMENT?: string;

  // App / HTTP
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) PORT?: number;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) DISABLE_REGISTRATION?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  HTTP_KEEP_ALIVE_TIMEOUT_MS?: number;

  // Auth — JWT_SECRET / COOKIE_SECRET are required in every environment; there
  // is no insecure default fallback (a shared default would let anyone forge
  // auth tokens/cookies). COOKIE_SECURE=true is additionally required in
  // production, enforced by validateProductionRules below.
  @IsNotEmpty({
    message:
      'JWT_SECRET is required (generate one with `openssl rand -hex 32`)',
  })
  JWT_SECRET!: string;
  @IsNotEmpty({
    message:
      'COOKIE_SECRET is required (generate one with `openssl rand -hex 32`)',
  })
  COOKIE_SECRET!: string;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) COOKIE_SECURE?: string;
  @IsOptional() @IsIn(['lax', 'strict', 'none']) COOKIE_SAME_SITE?: string;
  @IsOptional() @IsIn(['local', 'cloud']) AUTH_PROVIDER?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  PASSWORD_HASH_ROUNDS?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  SESSION_REFRESH_GRACE_SECONDS?: number;

  // Database
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) POSTGRES_PORT?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  POSTGRES_POOL_SIZE?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  POSTGRES_STATEMENT_TIMEOUT_MS?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  POSTGRES_IDLE_TX_TIMEOUT_MS?: number;

  // Storage (MinIO) — production requires credentials (see production rules).
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) MINIO_PORT?: number;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) MINIO_USE_SSL?: string;

  // Redis — production requires REDIS_PASSWORD (see production rules).
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) REDIS_PORT?: number;

  // Emails (SMTP)
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) SMTP_PORT?: number;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) SMTP_SECURE?: string;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) SMTP_REQUIRE_TLS?: string;

  // Subscriptions / trial
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  SUBSCRIPTIONS_PRICE_PER_SEAT_MONTHLY?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  SUBSCRIPTIONS_PRICE_PER_SEAT_YEARLY?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  TRIAL_MAX_MESSAGES?: number;

  // Retrieval / tools / URL retriever
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  PROCESSING_MAX_PDF_PAGES?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  EMBEDDINGS_MAX_CONCURRENCY?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SOURCE_GET_TEXT_MAX_LINES?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  SOURCE_GET_TEXT_MAX_CHARS?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  URL_RETRIEVER_TIMEOUT_MS?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  URL_RETRIEVER_MAX_DOWNLOAD_BYTES?: number;

  // Internet search
  @IsOptional() @IsIn(['brave', 'staan']) INTERNET_SEARCH_PROVIDER?: string;
  @IsOptional() @IsIn(['de-de', 'en-us', 'fr-fr']) STAAN_SEARCH_MARKET?: string;

  // Feature flags
  @IsOptional() @IsIn(BOOLEAN_STRINGS) FEATURE_KNOWLEDGE_BASES_ENABLED?: string;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) FEATURE_LETTERHEADS_ENABLED?: string;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) FEATURE_SKILLS_ENABLED?: string;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) FEATURE_WORKSPACES_ENABLED?: string;
  @IsOptional() @IsIn(BOOLEAN_STRINGS) FEATURE_AGENT_RUNTIME_ENABLED?: string;

  // Retention
  @IsOptional() @IsIn(BOOLEAN_STRINGS) RETENTION_DRY_RUN?: string;
}

/**
 * dotenv turns `FOO=` into `""`, but class-validator's `@IsOptional` only skips
 * `null`/`undefined`. Drop blank string values so they count as unset and the
 * optional shape checks (and the required-secret checks) behave correctly.
 */
function withoutBlanks(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    result[key] = value;
  }
  return result;
}

function collectConstraintMessages(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

/**
 * Cross-field rules that only apply in production, folded in from the former
 * storage/redis/auth factory asserts. Blank values are already dropped, so a
 * missing secret is `undefined` here.
 */
function validateProductionRules(env: Record<string, unknown>): string[] {
  if (env.NODE_ENV !== 'production') {
    return [];
  }
  const messages: string[] = [];
  if (env.COOKIE_SECURE !== 'true') {
    messages.push(
      'COOKIE_SECURE must be "true" in production; session cookies would ' +
        'otherwise be sent over unencrypted HTTP (requires HTTPS)',
    );
  }
  if (!env.MINIO_ACCESS_KEY && !env.MINIO_ROOT_USER) {
    messages.push(
      'MINIO_ACCESS_KEY (or MINIO_ROOT_USER) is required in production',
    );
  }
  if (!env.MINIO_SECRET_KEY && !env.MINIO_ROOT_PASSWORD) {
    messages.push(
      'MINIO_SECRET_KEY (or MINIO_ROOT_PASSWORD) is required in production',
    );
  }
  if (!env.REDIS_PASSWORD) {
    messages.push(
      'REDIS_PASSWORD is required in production (Redis must run with ' +
        'authentication; generate one with `openssl rand -hex 32`)',
    );
  }
  return messages;
}

/**
 * Validate the whole environment at boot. Returns the untouched config on
 * success (factories keep reading `process.env`); throws one aggregated error
 * listing every problem otherwise.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const env = withoutBlanks(config);
  const validated = plainToInstance(EnvironmentVariables, env);
  const errors = validateSync(validated, { skipMissingProperties: false });
  const messages = [
    ...collectConstraintMessages(errors),
    ...validateProductionRules(env),
  ];
  if (messages.length > 0) {
    messages.sort((a, b) => a.localeCompare(b));
    throw new Error(
      'Invalid environment configuration — fix the following and restart:\n' +
        messages.map((message) => `  - ${message}`).join('\n'),
    );
  }
  return config;
}

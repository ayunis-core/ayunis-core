import { registerAs } from '@nestjs/config';

// Blank counts as unset: .env.example ships these keys empty.
const intWithDefault = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value?.trim() || String(fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const routinesConfig = registerAs('routines', () => ({
  // Routine runs per backend instance at once. Each holds provider calls and
  // a few database connections from the shared pool for its whole run.
  workerConcurrency: intWithDefault(process.env.ROUTINES_WORKER_CONCURRENCY, 2),
  // One execution, nudges included, is aborted after this long.
  runTimeoutMinutes: intWithDefault(
    process.env.ROUTINES_RUN_TIMEOUT_MINUTES,
    15,
  ),
}));

export type RoutinesConfig = ReturnType<typeof routinesConfig>;

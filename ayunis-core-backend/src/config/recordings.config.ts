import { registerAs } from '@nestjs/config';

// Blank counts as unset: .env.example ships these keys empty.
const intWithDefault = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value?.trim() || String(fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const recordingsConfig = registerAs('recordings', () => ({
  // Recording summaries generated per backend instance at once, on their own
  // queue apart from document processing. Each holds one model call.
  summaryConcurrency: intWithDefault(
    process.env.RECORDING_SUMMARY_CONCURRENCY,
    2,
  ),
}));

export type RecordingsConfig = ReturnType<typeof recordingsConfig>;

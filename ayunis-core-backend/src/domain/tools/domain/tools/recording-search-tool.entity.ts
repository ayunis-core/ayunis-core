import type { UUID } from 'crypto';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';

const MAX_QUERIES = 5;

// No `format: 'date-time'`: strict-mode providers reject it, so the times are
// checked in validateParams.
const recordingSearchToolParameters = {
  type: 'object' as const,
  properties: {
    queries: {
      type: 'array' as const,
      description:
        'One or more semantic search queries, e.g. alternative phrasings or sub-questions. Every query is searched in every readable recording.',
      items: { type: 'string' as const, minLength: 1 },
      minItems: 1,
      maxItems: MAX_QUERIES,
    },
    uploadedFrom: {
      type: 'string' as const,
      description:
        'Only recordings uploaded at or after this ISO 8601 date-time, e.g. 2026-03-01T00:00:00+01:00. Omit unless the user asks about a time.',
    },
    uploadedTo: {
      type: 'string' as const,
      description:
        'Only recordings uploaded at or before this ISO 8601 date-time, e.g. 2026-03-31T23:59:59+02:00. Omit unless the user asks about a time.',
    },
  },
  required: ['queries'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type RecordingSearchToolParameters = FromSchema<
  typeof recordingSearchToolParameters
>;

export interface RecordingSearchParameters {
  queries: string[];
  uploadedFrom?: Date;
  uploadedTo?: Date;
}

/** The chat searching: a workspace chat also searches that workspace's recordings. */
export class RecordingSearchScope {
  constructor(public readonly workspaceId: UUID | null) {}
}

export class RecordingSearchTool extends Tool {
  constructor(public readonly scope: RecordingSearchScope) {
    super({
      name: ToolType.RECORDING_SEARCH,
      description:
        'Search the transcripts and summaries of all meeting recordings the user can read through semantic search. Pass all phrasings or sub-questions as queries in a single call, optionally limited to recordings uploaded within a time range.',
      descriptionLong: [
        'Search the recordings BEFORE answering questions about meetings or what was said in them. If the recordings do not contain the answer, say so rather than guessing.',
        'Each result names its recording (recordingId, recordingName, uploadedAt) and where it lies: a time range of the transcript with its speakers, or the summary of the recording. Speaker labels come from the transcription and are not names.',
        'Cite every result you use with {{source:<chunkId>|<recording name>}}.',
      ].join(' '),
      parameters: recordingSearchToolParameters,
      type: ToolType.RECORDING_SEARCH,
    });
  }

  validateParams(params: Record<string, unknown>): RecordingSearchParameters {
    const validated = validateToolParams<RecordingSearchToolParameters>(
      this.parameters,
      params,
    );
    const uploadedFrom = parseTime('uploadedFrom', validated.uploadedFrom);
    const uploadedTo = parseTime('uploadedTo', validated.uploadedTo);
    if (uploadedFrom && uploadedTo && uploadedFrom > uploadedTo) {
      throw new Error("'uploadedFrom' must not be after 'uploadedTo'");
    }
    return { queries: [...validated.queries], uploadedFrom, uploadedTo };
  }

  get returnsPii(): boolean {
    return true;
  }
}

function parseTime(name: string, value: string | undefined): Date | undefined {
  if (value === undefined) return undefined;
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    throw new Error(
      `'${name}' must be a valid ISO 8601 date-time (e.g. 2026-03-01T00:00:00Z), received '${value}'`,
    );
  }
  return time;
}

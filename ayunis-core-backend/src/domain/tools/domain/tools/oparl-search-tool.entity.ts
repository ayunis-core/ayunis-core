import type { UUID } from 'crypto';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  OPARL_BODY_IDS_PARAMETER,
  OPARL_CITATION_GUIDANCE,
  parseOparlDateRange,
  parseOparlTextFilter,
  type OparlToolScope,
} from './oparl-tool-scope';

const MAX_QUERIES = 5;
const RESULT_TYPES = Object.values(OparlChunkSource);

const oparlSearchToolParameters = {
  type: 'object' as const,
  properties: {
    queries: {
      type: 'array' as const,
      description:
        'One to five search queries in German, e.g. alternative phrasings, synonyms or sub-questions ("Kita Erweiterung", "Kindertagesstätte Neubau"). Every query is searched with full-text and semantic search.',
      items: { type: 'string' as const, minLength: 1, maxLength: 500 },
      minItems: 1,
      maxItems: MAX_QUERIES,
    },
    bodyIds: OPARL_BODY_IDS_PARAMETER,
    from: {
      type: 'string' as const,
      description:
        'Only results dated on or after this day (YYYY-MM-DD): the date of a paper, the day of a meeting, or the date of a document. Omit unless the user asks about a time.',
    },
    to: {
      type: 'string' as const,
      description:
        'Only results dated on or before this day (YYYY-MM-DD). Omit unless the user asks about a time.',
    },
    organizationId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'Only meetings of this organization (committee, council, faction) and papers it submitted or deliberated. The ID comes from oparl_list or earlier results.',
    },
    personId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'Only papers this person submitted and meetings they took part in. The ID comes from oparl_list or earlier results.',
    },
    paperType: {
      type: 'string' as const,
      minLength: 1,
      maxLength: 100,
      description:
        'Only papers whose type contains this text, case-insensitive, e.g. "Antrag", "Anfrage", "Beschlussvorlage", "Mitteilung".',
    },
    types: {
      type: 'array' as const,
      description:
        'Only results of these types: agenda_item (an agenda item with its result and resolution text, i.e. what was decided), file (a passage of a document: protocols, resolutions, attachments), paper (the title of a paper), meeting (the name of a meeting). Omit for all.',
      items: { type: 'string' as const, enum: RESULT_TYPES },
      minItems: 1,
      maxItems: RESULT_TYPES.length,
    },
    meetingId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'Only this meeting: its agenda items and its documents (invitation, protocols, attachments). The ID comes from oparl_list, oparl_get or earlier results.',
    },
    paperId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'Only this paper: its documents and the agenda items that deliberated it. The ID comes from oparl_get or earlier results.',
    },
    fileId: {
      type: 'string' as const,
      format: 'uuid' as const,
      description:
        'Only passages of this document, e.g. to find where a long protocol deals with the topic instead of reading every page. The ID comes from oparl_get or earlier results.',
    },
    page: {
      type: 'integer' as const,
      minimum: 1,
      description:
        'Page of results, 10 per page, starting at 1. While a result says hasMore, the next page holds further matches. Defaults to 1.',
    },
  },
  required: ['queries'],
  additionalProperties: false,
} as const satisfies JSONSchema;

type OparlSearchToolParameters = FromSchema<typeof oparlSearchToolParameters>;

export interface OparlSearchParameters {
  queries: string[];
  bodyIds: UUID[];
  filters: {
    from?: string;
    to?: string;
    organizationId?: UUID;
    personId?: UUID;
    paperType?: string;
    sources?: OparlChunkSource[];
    meetingId?: UUID;
    paperId?: UUID;
    fileId?: UUID;
  };
  page: number;
}

export class OparlSearchTool extends Tool {
  constructor(public readonly scope: OparlToolScope) {
    super({
      name: ToolType.OPARL_SEARCH,
      description: `Search the council information system (Ratsinformationssystem) of the organization's linked bodies: papers (Vorlagen, Anträge, Anfragen, Mitteilungen), meetings, agenda items with their results and resolutions, and the text of their documents (protocols, resolutions, attachments). Returns 10 results per page, one per document page, paper, meeting or agenda item. Pass all phrasings in a single call; optionally filter by body, date range, organization, person, paper type, result type, or a single meeting, paper or document. Linked bodies: ${scope.describeBodies()}.`,
      descriptionLong: [
        `The council information tools hold the papers, meetings, agenda items, committees, factions, members and documents of the linked councils (${scope.describeBodies()}). Use them for every question about these councils' work instead of answering from memory or the internet.`,
        'Search first with oparl_search, in German. Then use oparl_get for a paper with its way through the committees (consultations, results, resolutions), a meeting with its agenda, or an organization or person with their memberships; oparl_read_file for the full text of a document; oparl_list for the meetings of a period or a committee, and for organizations and persons. IDs come from earlier results.',
        'For everything on a topic in a period, such as all decisions on a topic in a year, filter by date and type and read on with page while hasMore is true. To find a topic in a long document, search with its fileId and read on from the page found.',
        OPARL_CITATION_GUIDANCE,
        'If the results do not answer the question, say so rather than guessing.',
      ].join(' '),
      parameters: oparlSearchToolParameters,
      type: ToolType.OPARL_SEARCH,
    });
  }

  validateParams(params: Record<string, unknown>): OparlSearchParameters {
    const validated = validateToolParams<OparlSearchToolParameters>(
      this.parameters,
      params,
    );
    const queries = validated.queries.map((query) => query.trim());
    if (queries.some((query) => query.length === 0)) {
      throw new Error("'queries' must not contain empty queries");
    }
    return {
      queries,
      bodyIds: (validated.bodyIds ?? []) as UUID[],
      filters: {
        ...parseOparlDateRange(validated),
        organizationId: validated.organizationId as UUID | undefined,
        personId: validated.personId as UUID | undefined,
        paperType: parseOparlTextFilter('paperType', validated.paperType),
        sources: validated.types && [...new Set(validated.types)],
        meetingId: validated.meetingId as UUID | undefined,
        paperId: validated.paperId as UUID | undefined,
        fileId: validated.fileId as UUID | undefined,
      },
      page: validated.page ?? 1,
    };
  }

  /** Public council data, not anonymized in anonymous runs (like `website_content`). */
  get returnsPii(): boolean {
    return false;
  }
}

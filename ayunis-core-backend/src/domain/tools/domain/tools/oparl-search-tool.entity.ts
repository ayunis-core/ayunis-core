import type { UUID } from 'crypto';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';
import { validateToolParams } from 'src/common/validators/tool-params.validator';
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
  };
}

export class OparlSearchTool extends Tool {
  constructor(public readonly scope: OparlToolScope) {
    super({
      name: ToolType.OPARL_SEARCH,
      description: `Search the council information system (Ratsinformationssystem) of the organization's linked bodies: papers (Vorlagen, Anträge, Anfragen, Mitteilungen), meetings, agenda items with their results and resolutions, and the text of their documents (protocols, resolutions, attachments). Pass all phrasings in a single call; optionally filter by body, date range, organization, person or paper type. Linked bodies: ${scope.describeBodies()}.`,
      descriptionLong: [
        `The council information tools hold the papers, meetings, agenda items, committees, factions, members and documents of the linked councils (${scope.describeBodies()}). Use them for every question about these councils' work instead of answering from memory or the internet.`,
        'Search first with oparl_search, in German. Then use oparl_get for a paper with its way through the committees (consultations, results, resolutions), a meeting with its agenda, or an organization or person with their memberships; oparl_read_file for the full text of a document; oparl_list for the meetings of a period or a committee, and for organizations and persons. IDs come from earlier results.',
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
      },
    };
  }

  /** Public council data, not anonymized in anonymous runs (like `website_content`). */
  get returnsPii(): boolean {
    return false;
  }
}

import type { UUID } from 'crypto';

export interface OparlToolBody {
  id: UUID;
  name: string | null;
  systemName: string | null;
}

/**
 * The bodies linked to the run's org when the tools were assembled, named in
 * the descriptions. Not the access check: every call looks the links up again.
 */
export class OparlToolScope {
  constructor(readonly bodies: readonly OparlToolBody[]) {}

  describeBodies(): string {
    return this.bodies
      .map((body) => {
        const name = oneLine(body.name ?? 'Unnamed body');
        const system = body.systemName ? `, ${oneLine(body.systemName)}` : '';
        return `${name} (bodyId ${body.id}${system})`;
      })
      .join('; ');
  }
}

function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A calendar date as `YYYY-MM-DD`; the schema keeps it a plain string for strict-mode providers. */
export function parseOparlDate(
  name: string,
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  // A day that does not exist (2026-02-30) rolls over or is invalid.
  const time = DATE_ONLY.test(value)
    ? new Date(`${value}T00:00:00Z`).getTime()
    : NaN;
  if (
    Number.isNaN(time) ||
    new Date(time).toISOString().slice(0, 10) !== value
  ) {
    throw new Error(
      `'${name}' must be a date as YYYY-MM-DD (e.g. 2026-03-01), received '${value}'`,
    );
  }
  return value;
}

export function parseOparlDateRange(params: { from?: string; to?: string }): {
  from?: string;
  to?: string;
} {
  const from = parseOparlDate('from', params.from);
  const to = parseOparlDate('to', params.to);
  if (from && to && from > to) {
    throw new Error("'from' must not be after 'to'");
  }
  return { from, to };
}

/** A text filter without surrounding spaces; a blank one is refused, since dropping it would widen the results. */
export function parseOparlTextFilter(
  name: string,
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const text = value.trim();
  if (text.length === 0) throw new Error(`'${name}' must not be blank`);
  return text;
}

export const OPARL_BODY_IDS_PARAMETER = {
  type: 'array' as const,
  description:
    'Only these bodies (bodyId as listed in the oparl_search description). Omit to use all linked bodies.',
  items: { type: 'string' as const, format: 'uuid' as const },
  maxItems: 50,
};

export const OPARL_CITATION_GUIDANCE =
  'Cite every paper, meeting, agenda item or document you use with {{url:<url>}}, taking its `url` from the tool results; never invent URLs.';

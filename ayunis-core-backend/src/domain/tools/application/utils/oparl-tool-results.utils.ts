import * as cheerio from 'cheerio';
import { extractHtmlDocumentText } from 'src/common/util/html-text-extraction';
import { OparlChunkSource } from 'src/domain/oparl/domain/oparl-chunk-source.enum';
import { OparlFileTextStatus } from 'src/domain/oparl/domain/oparl-file-text';
import type {
  OparlFileReading,
  OparlListResult,
  OparlObjectDetail,
} from 'src/domain/oparl/application/models/oparl-read';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import type {
  OparlSearchOutcome,
  OparlSearchResult,
} from 'src/domain/oparl/application/models/oparl-search';

/** Resolution texts beyond this are cut in `oparl_get`; the resolution file holds the full text. */
export const OPARL_RESOLUTION_TEXT_LIMIT = 2_000;

const HTML_TAG = /<\/?[a-z][^>]*>/i;
const LONG_TEXT_KEYS = new Set(['resolutionText', 'result']);

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** The RIS link an object is cited with: a file's access URL, else its web page. */
function citationUrl(object: { [key: string]: Json }): Json {
  return object.accessUrl ?? object.web ?? null;
}

function plainText(text: string, limit?: number): string {
  const plain = HTML_TAG.test(text)
    ? extractHtmlDocumentText(cheerio.load(text))
    : text.trim();
  if (limit === undefined || plain.length <= limit) return plain;
  return `${plain.slice(0, limit)} […]`;
}

function compactList(items: Json[], textLimit?: number): Json | undefined {
  const compacted = items
    .map((item) => compact(item, textLimit))
    .filter((item): item is Json => item !== undefined);
  return compacted.length > 0 ? compacted : undefined;
}

function compactEntry(key: string, entry: Json, textLimit?: number) {
  return typeof entry === 'string' && LONG_TEXT_KEYS.has(key)
    ? plainText(entry, textLimit)
    : compact(entry, textLimit);
}

function compactObject(
  value: { [key: string]: Json },
  textLimit?: number,
): Json {
  const result: { [key: string]: Json } = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === 'web' || key === 'accessUrl') continue;
    const compacted = compactEntry(key, entry, textLimit);
    if (compacted !== undefined && compacted !== '') result[key] = compacted;
  }
  const url = citationUrl(value);
  if (url !== null) result.url = url;
  return result;
}

/**
 * Drops `null` and empty lists, puts each object's citation link under
 * `url`, and cuts long result and resolution texts, so the model gets the
 * facts without padding.
 */
// eslint-disable-next-line sonarjs/function-return-type -- returns any JSON value, compacted
function compact(value: Json, textLimit?: number): Json | undefined {
  if (value === null) return undefined;
  if (Array.isArray(value)) return compactList(value, textLimit);
  if (typeof value === 'object') return compactObject(value, textLimit);
  return value;
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

/** A document passage is cited by its file, anything else by its own page first. */
function searchResultUrl(result: OparlSearchResult): string | null {
  const candidates =
    result.source === OparlChunkSource.MEETING
      ? [result.meeting?.web]
      : [result.agendaItem?.web, result.paper?.web, result.meeting?.web];
  return [result.file?.accessUrl, ...candidates].find((url) => url) ?? null;
}

function toSearchResult(result: OparlSearchResult): Json | undefined {
  return compact({
    type: result.source,
    url: searchResultUrl(result),
    date: result.date,
    body: result.body.name,
    paper: result.paper && toJson(result.paper),
    meeting: result.meeting && toJson(result.meeting),
    agendaItem: result.agendaItem && toJson(result.agendaItem),
    file: result.file && {
      id: result.file.id,
      name: result.file.name,
      page: result.file.pageNumber,
      accessUrl: result.file.accessUrl,
    },
    text: result.text,
    matchedQueries: result.matchedQueries,
  });
}

export function oparlSearchToolResult(outcome: OparlSearchOutcome): string {
  return JSON.stringify({
    mode: outcome.mode,
    resultCount: outcome.results.length,
    results: outcome.results.map(toSearchResult),
  });
}

export function oparlObjectToolResult(object: OparlObjectDetail): string {
  return JSON.stringify(compact(toJson(object), OPARL_RESOLUTION_TEXT_LIMIT));
}

export function oparlFileToolResult(reading: OparlFileReading): string {
  const { file, status, skipReason, pageCount, pages, nextPage } = reading;
  return JSON.stringify({
    file: compact(toJson(file)),
    ...(status === OparlFileTextStatus.EXTRACTED
      ? { pageCount, pages, nextPage }
      : { textAvailable: false, status: status ?? 'pending', skipReason }),
  });
}

export function oparlListToolResult(result: OparlListResult): string {
  return JSON.stringify({
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    hasMore: result.hasMore,
    items: compact(toJson(result.items)) ?? [],
  });
}

/**
 * A schema violation must reach the model so it can correct the call;
 * ExecuteToolUseCase hides raw errors from it.
 */
export function validateOparlToolInput<T>(
  tool: { name: string; validateParams(input: Record<string, unknown>): T },
  input: Record<string, unknown>,
): T {
  try {
    return tool.validateParams(input);
  } catch (error) {
    throw new ToolExecutionFailedError({
      toolName: tool.name,
      exposeToLLM: true,
      message: error instanceof Error ? error.message : 'Invalid input',
    });
  }
}

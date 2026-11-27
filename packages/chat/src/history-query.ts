import { getThreadsControllerFindAllQueryOptions } from '@ayunis/api-client/endpoints';

const CHAT_HISTORY_PAGE_SIZE = 20;

export interface ChatHistoryPageRequest {
  /** Matches a chat's title or content. */
  readonly search?: string;
  /** 1-based. */
  readonly page: number;
}

/**
 * The query `History` loads a page with. The session decides whose and which
 * surface's chats come back, so the request names no surface. A host can
 * prefetch a page with it, e.g. in a route loader.
 */
export function chatHistoryQuery({ search, page }: ChatHistoryPageRequest) {
  return getThreadsControllerFindAllQueryOptions({
    ...(search ? { search } : {}),
    limit: CHAT_HISTORY_PAGE_SIZE,
    offset: (page - 1) * CHAT_HISTORY_PAGE_SIZE,
  });
}

/** Without a total, a full page suggests there is a next one. */
export function chatHistoryPageCount(
  page: number,
  total: number | undefined,
  shown: number,
): number {
  if (total !== undefined) return Math.ceil(total / CHAT_HISTORY_PAGE_SIZE);
  return page + Number(shown === CHAT_HISTORY_PAGE_SIZE);
}

/** The last page that still has chats, once deleting emptied a later one. */
export function chatHistoryPageInRange(
  page: number,
  total: number | undefined,
): number {
  if (total === undefined || page === 1) return page;
  if ((page - 1) * CHAT_HISTORY_PAGE_SIZE < total) return page;
  return Math.max(1, Math.ceil(total / CHAT_HISTORY_PAGE_SIZE));
}

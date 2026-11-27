import { getApiTransport } from '@ayunis/api-client/transport';
import type {
  ActiveThreadRunResponseDto,
  GetThreadResponseDto,
  GetThreadsResponseDtoItem,
} from '@ayunis/api-client/schemas';

export const model = {
  id: 'model-1',
  modelId: 'catalog-model',
  name: 'model',
  provider: 'mistral',
  displayName: 'Municipal model',
  isDefault: true,
  canVision: false,
};

/** What the screens load for themselves, answered with neutral defaults. */
const DEFAULTS: Record<string, unknown> = {
  'GET /models/permitted/language-models': [model],
  'GET /models/modes': [],
  'GET /feature-toggles': {},
  'GET /academy-access/status': { allowed: true },
  'GET /models/embedding/enabled': { isEmbeddingModelEnabled: false },
  'GET /models/default-selection': { mode: null, permittedModelId: model.id },
  'GET /chat-settings/chat-start-defaults': { anonymousModeByDefault: false },
};

export interface ServedRequest {
  readonly method: string;
  readonly url: string;
  readonly params?: Record<string, unknown>;
  readonly data: unknown;
}

interface ServedConfig {
  readonly params?: unknown;
  readonly data?: unknown;
}

type Route = (request: ServedConfig) => unknown;

export function storedChat(
  id: string,
  title: string,
  messages: GetThreadResponseDto['messages'] = [],
): GetThreadResponseDto {
  return {
    id,
    title,
    messages,
    piiMasks: [],
    sources: [],
    knowledgeBases: [],
    mcpIntegrations: [],
    isAnonymous: false,
    mode: null,
    permittedModelId: model.id,
    modelId: model.modelId,
    workspaceId: null,
    origin: { kind: 'chat' },
    isLongChat: false,
    createdAt: '2026-11-27T12:00:00Z',
    updatedAt: '2026-11-27T12:00:00Z',
  } as unknown as GetThreadResponseDto;
}

function listItem(chat: GetThreadResponseDto): GetThreadsResponseDtoItem {
  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    isAnonymous: chat.isAnonymous,
    mode: null,
    workspaceId: null,
    origin: { kind: 'chat' },
  };
}

type Chats = Map<string, GetThreadResponseDto>;

function listPage(chats: Chats, { params }: ServedConfig) {
  const { limit = 20, offset = 0 } = (params ?? {}) as {
    limit?: number;
    offset?: number;
  };
  const all = [...chats.values()].reverse().map(listItem);
  return {
    data: all.slice(offset, offset + limit),
    pagination: { limit, offset, total: all.length },
  };
}

/** `GET`, rename (`PATCH …/title`) and `DELETE` of one stored chat. */
function chatRoute(
  chats: Chats,
  method: string,
  url: string,
  config: ServedConfig,
): unknown {
  const [, id, title] = /^\/threads\/([^/]+)(\/title)?$/.exec(url) ?? [];
  const chat = id ? chats.get(id) : undefined;
  if (!chat) return undefined;
  const route = `${method}${title ?? ''}`;
  if (route === 'GET') return chat;
  if (route === 'PATCH/title') {
    const body = JSON.parse(String(config.data)) as { title: string };
    chats.set(chat.id, { ...chat, title: body.title });
    return null;
  }
  if (route === 'DELETE') {
    chats.delete(chat.id);
    return null;
  }
  return undefined;
}

type Answer = (method: string, url: string, config: ServedConfig) => unknown;

/** Answers the configured transport's requests; `undefined` answers 404. */
function serveOnTransport(answer: Answer, requests: ServedRequest[]) {
  getApiTransport().axios.defaults.adapter = (config) => {
    const method = (config.method ?? 'get').toUpperCase();
    const url = config.url ?? '';
    const params = config.params as Record<string, unknown> | undefined;
    requests.push({ method, url, params, data: config.data });
    const data = answer(method, url, config);
    if (data === undefined) {
      return Promise.reject(
        Object.assign(new Error(`Not served: ${method} ${url}`), {
          isAxiosError: true,
          response: { status: 404, data: { code: 'NOT_FOUND' } },
        }),
      );
    }
    return Promise.resolve({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });
  };
}

/**
 * A backend of the signed-in user's chats on the configured API transport:
 * list, get, create, rename and delete, plus the runs in progress. Unknown
 * routes answer 404.
 */
export function serveChatBackend(chats: readonly GetThreadResponseDto[]) {
  const stored: Chats = new Map(chats.map((chat) => [chat.id, chat]));
  const server = {
    requests: [] as ServedRequest[],
    activeRuns: [] as ActiveThreadRunResponseDto[],
    created: 0,
    chats: stored,
  };
  const routes: Record<string, Route> = {
    'GET /threads': (config) => listPage(stored, config),
    'POST /threads': () => {
      server.created += 1;
      const chat = storedChat(`started-${server.created}`, '');
      stored.set(chat.id, chat);
      return chat;
    },
    'GET /runs/active': () => server.activeRuns,
  };
  serveOnTransport((method, url, config) => {
    const key = `${method} ${url}`;
    if (key in routes) return routes[key](config);
    if (key in DEFAULTS) return DEFAULTS[key];
    return chatRoute(stored, method, url, config);
  }, server.requests);
  return server;
}

import type { ToolCardRegistration } from '@ayunis/chat/tool-cards';

export type ToolCards = ReadonlyMap<string, ToolCardRegistration>;
export const EMPTY_TOOL_CARDS: ToolCards = new Map();

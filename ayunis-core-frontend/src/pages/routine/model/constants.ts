export const ROUTINE_TABS = [
  'configuration',
  'notifications',
  'chats',
] as const;
export type RoutineTab = (typeof ROUTINE_TABS)[number];

export const ROUTINE_ITEMS_PER_PAGE = 20;

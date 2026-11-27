export const ADVENT_CALENDAR_DOOR_COUNT = 24;
export const ADVENT_CALENDAR_TITLE_MAX_LENGTH = 200;
export const ADVENT_CALENDAR_BODY_MAX_LENGTH = 5000;
export const ADVENT_CALENDAR_MAX_BUTTONS = 2;
export const ADVENT_CALENDAR_BUTTON_LABEL_MAX_LENGTH = 40;
export const ADVENT_CALENDAR_LINK_URL_MAX_LENGTH = 2000;
export const ADVENT_CALENDAR_PROMPT_MAX_LENGTH = 4000;
export const ADVENT_CALENDAR_QUIZ_QUESTION_MAX_LENGTH = 300;
export const ADVENT_CALENDAR_QUIZ_MIN_ANSWERS = 2;
export const ADVENT_CALENDAR_QUIZ_MAX_ANSWERS = 4;
export const ADVENT_CALENDAR_QUIZ_ANSWER_MAX_LENGTH = 150;
export const ADVENT_CALENDAR_QUIZ_EXPLANATION_MAX_LENGTH = 1000;
export const ADVENT_CALENDAR_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
/**
 * Door images live here, outside every org-scoped storage layout, so the org
 * purge and the orphan sweep never delete them.
 */
export const ADVENT_CALENDAR_IMAGE_PREFIX = 'advent-calendar/';

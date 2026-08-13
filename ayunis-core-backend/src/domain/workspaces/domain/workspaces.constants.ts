export const WORKSPACE_NAME_MAX_LENGTH = 255;
export const WORKSPACE_DESCRIPTION_MAX_LENGTH = 1000;

export const DEFAULT_WORKSPACE_ICON = 'folder';
export const DEFAULT_WORKSPACE_COLOR = 'violet';
export const WORKSPACE_MAX_SOURCES = 500;

/**
 * Icons and colours are chosen from a catalogue the frontend owns; the backend
 * stores the opaque key and only guards its shape so the column cannot become a
 * dumping ground. Colours are either a palette key or a `#rrggbb` literal — the
 * custom-colour picker produces the latter.
 */
export const WORKSPACE_ICON_PATTERN = /^[a-z][a-z0-9-]{0,63}$/;
export const WORKSPACE_COLOR_PATTERN = /^(?:[a-z]{1,31}|#[0-9a-fA-F]{6})$/;

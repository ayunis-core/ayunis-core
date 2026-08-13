import {
  InvalidWorkspaceAppearanceError,
  InvalidWorkspaceDescriptionError,
  InvalidWorkspaceNameError,
} from '../workspaces.errors';
import {
  WORKSPACE_COLOR_PATTERN,
  WORKSPACE_DESCRIPTION_MAX_LENGTH,
  WORKSPACE_ICON_PATTERN,
  WORKSPACE_NAME_MAX_LENGTH,
} from '../../domain/workspaces.constants';

const CONTROL_CHARS = /\p{Cc}/u;

function isValidWorkspaceName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= WORKSPACE_NAME_MAX_LENGTH &&
    name === name.trim() &&
    !CONTROL_CHARS.test(name)
  );
}

// The `typeof` guards exist because `@IsOptional()` on the update DTO also
// waves `null` through, and `RegExp.test(null)` stringifies to `"null"` and
// matches — a provided but non-string value must fail, not silently pass.

function assertName(name: string | null | undefined): void {
  if (name === undefined) return;
  if (typeof name !== 'string' || !isValidWorkspaceName(name)) {
    throw new InvalidWorkspaceNameError(String(name));
  }
}

function assertDescription(description: string | null | undefined): void {
  if (description === undefined || description === null) return;
  if (
    typeof description !== 'string' ||
    description.length > WORKSPACE_DESCRIPTION_MAX_LENGTH
  ) {
    throw new InvalidWorkspaceDescriptionError();
  }
}

function assertAppearance(
  value: string | null | undefined,
  field: 'icon' | 'color',
  pattern: RegExp,
): void {
  if (value === undefined) return;
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new InvalidWorkspaceAppearanceError(field);
  }
}

/**
 * Validates every provided field; `undefined` means "not part of this
 * request" and is skipped, so the same helper serves create (all fields
 * present) and partial update.
 */
export function assertValidWorkspaceFields(fields: {
  name?: string | null;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}): void {
  assertName(fields.name);
  assertDescription(fields.description);
  assertAppearance(fields.icon, 'icon', WORKSPACE_ICON_PATTERN);
  assertAppearance(fields.color, 'color', WORKSPACE_COLOR_PATTERN);
}

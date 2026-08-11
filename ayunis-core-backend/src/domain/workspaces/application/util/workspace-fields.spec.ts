import { assertValidWorkspaceFields } from './workspace-fields';
import {
  InvalidWorkspaceAppearanceError,
  InvalidWorkspaceDescriptionError,
  InvalidWorkspaceNameError,
} from '../workspaces.errors';

describe('assertValidWorkspaceFields', () => {
  it('accepts a fully valid field set', () => {
    expect(() =>
      assertValidWorkspaceFields({
        name: 'Bürgeranfragen',
        description: null,
        icon: 'folder',
        color: 'violet',
      }),
    ).not.toThrow();
  });

  it('skips fields that are not part of the request', () => {
    expect(() => assertValidWorkspaceFields({})).not.toThrow();
  });

  it('rejects an empty name', () => {
    expect(() => assertValidWorkspaceFields({ name: '' })).toThrow(
      InvalidWorkspaceNameError,
    );
  });

  it('rejects an over-long description', () => {
    expect(() =>
      assertValidWorkspaceFields({ description: 'x'.repeat(10_001) }),
    ).toThrow(InvalidWorkspaceDescriptionError);
  });

  it('rejects an unknown icon and color', () => {
    expect(() => assertValidWorkspaceFields({ icon: 'not a key!' })).toThrow(
      InvalidWorkspaceAppearanceError,
    );
    expect(() => assertValidWorkspaceFields({ color: 'plaid!' })).toThrow(
      InvalidWorkspaceAppearanceError,
    );
  });

  // @IsOptional() on the update DTO waves null through class-validator, so
  // the application-layer guard is the last line of defence against it.
  it('rejects null for the non-nullable fields', () => {
    expect(() => assertValidWorkspaceFields({ name: null })).toThrow(
      InvalidWorkspaceNameError,
    );
    expect(() => assertValidWorkspaceFields({ icon: null })).toThrow(
      InvalidWorkspaceAppearanceError,
    );
    expect(() => assertValidWorkspaceFields({ color: null })).toThrow(
      InvalidWorkspaceAppearanceError,
    );
  });
});

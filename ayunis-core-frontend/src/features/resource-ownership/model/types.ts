export type OwnedResourceKind = 'skill' | 'knowledge-base' | 'recording';

/** An owner a skill, knowledge base or recording can be created for or moved to. */
export type OwnerSelection =
  | { ownerType: 'personal' }
  | { ownerType: 'team'; teamId: string }
  | { ownerType: 'org' };

/** The ownership fields every skill, knowledge-base and recording response carries. */
export interface OwnedResource {
  ownerType: 'personal' | 'workspace' | 'team' | 'org';
  teamId?: string;
  isShared?: boolean;
}

export interface OwnerOption {
  /** Stable select value: `personal`, `org` or `team:<id>`. */
  key: string;
  selection: OwnerSelection;
  label: string;
}

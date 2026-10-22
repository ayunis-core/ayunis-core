import type { WorkspaceLinkRef } from 'src/domain/workspaces/domain/workspace-link';

export class DescribeLinkedWorkspacesQuery {
  constructor(public readonly links: WorkspaceLinkRef[]) {}
}

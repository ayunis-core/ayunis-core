import type { UUID } from 'crypto';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { Workspace } from './workspace.entity';

const USER_ID = '10000000-0000-4000-8000-000000000001' as UUID;
const ORG_ID = '10000000-0000-4000-8000-000000000002' as UUID;

function createWorkspace(): Workspace {
  return new Workspace({
    userId: USER_ID,
    orgId: ORG_ID,
    name: 'Beschaffungsprojekt',
  });
}

describe('Workspace visibility', () => {
  it('creates a private workspace by default', () => {
    expect(createWorkspace().visibility).toBe(WorkspaceVisibility.PRIVATE);
  });

  it('changes workspace visibility', () => {
    const workspace = createWorkspace();

    workspace.changeVisibility(WorkspaceVisibility.ORGANIZATION);

    expect(workspace.visibility).toBe(WorkspaceVisibility.ORGANIZATION);
  });
});

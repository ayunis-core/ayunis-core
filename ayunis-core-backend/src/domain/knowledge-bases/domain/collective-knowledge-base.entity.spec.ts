import { randomUUID } from 'crypto';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';

describe('Team- and org-owned knowledge bases', () => {
  const orgId = randomUUID();
  const teamId = randomUUID();

  it('is owned by exactly one team of its organization', () => {
    const knowledgeBase = new TeamKnowledgeBase({
      name: 'Bauordnung',
      orgId,
      teamId,
    });

    expect(knowledgeBase.teamId).toBe(teamId);
    expect(knowledgeBase.orgId).toBe(orgId);
    expect('userId' in knowledgeBase).toBe(false);
    expect('workspaceId' in knowledgeBase).toBe(false);
  });

  it('is owned by its organization', () => {
    const knowledgeBase = new OrgKnowledgeBase({ name: 'Satzungen', orgId });

    expect(knowledgeBase.orgId).toBe(orgId);
    expect('teamId' in knowledgeBase).toBe(false);
    expect('userId' in knowledgeBase).toBe(false);
  });

  it.each([
    new TeamKnowledgeBase({ name: 'Bauordnung', orgId, teamId }),
    new OrgKnowledgeBase({ name: 'Satzungen', orgId }),
  ])('starts inactive unless state is given', (knowledgeBase) => {
    expect(knowledgeBase.isActive).toBe(false);
  });

  it('keeps the given global state', () => {
    const knowledgeBase = new OrgKnowledgeBase({
      name: 'Satzungen',
      orgId,
      isActive: true,
    });

    expect(knowledgeBase.isActive).toBe(true);
  });
});

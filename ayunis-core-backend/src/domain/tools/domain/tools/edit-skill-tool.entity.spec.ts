import { randomUUID } from 'crypto';
import { EditSkillTool } from './edit-skill-tool.entity';

describe('EditSkillTool', () => {
  const personalId = randomUUID();
  const workspaceId = randomUUID();
  const tool = new EditSkillTool(
    new Map([
      ['user__meeting-notes', personalId],
      ['workspace__meeting-notes', workspaceId],
    ]),
  );

  const params = {
    skill_slug: 'workspace__meeting-notes',
    skill_id: workspaceId,
    name: '',
    short_description: '',
    instructions: 'Use the approved minutes format.',
    change_summary: 'Use the approved format',
  };

  it('accepts the immutable id paired with the selected slug', () => {
    expect(tool.validateParams(params)).toEqual(params);
  });

  it('rejects an id that belongs to a different slug', () => {
    expect(() =>
      tool.validateParams({ ...params, skill_id: personalId }),
    ).toThrow('skill_id does not match skill_slug');
  });
});

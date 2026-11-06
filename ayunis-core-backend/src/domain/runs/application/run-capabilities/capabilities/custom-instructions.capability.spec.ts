import { PromptSlot } from 'src/domain/runs/application/run-capabilities/run-capability';
import { sectionsIn } from 'src/domain/runs/testing/run-capability.fixture';
import { CustomInstructionsCapability } from './custom-instructions.capability';

function buildCapability(prompts: { org?: string; user?: string }) {
  const resolve = (systemPrompt?: string) => ({
    execute: jest
      .fn()
      .mockResolvedValue(systemPrompt === undefined ? null : { systemPrompt }),
  });
  return new CustomInstructionsCapability(
    resolve(prompts.org) as never,
    resolve(prompts.user) as never,
  );
}

describe('CustomInstructionsCapability', () => {
  it('adds the organization instructions before the user instructions', async () => {
    const contribution = await buildCapability({
      org: 'All responses must comply with municipal communication guidelines.',
      user: 'Always respond in bullet points. I work in the finance department.',
    }).contribute();

    const [org, user] = sectionsIn(
      contribution,
      PromptSlot.CUSTOM_INSTRUCTIONS,
    );
    expect(org).toContain('<organization_instructions>');
    expect(org).toContain(
      'All responses must comply with municipal communication guidelines.',
    );
    expect(user).toContain('<user_instructions>');
    expect(user).toContain(
      'Always respond in bullet points. I work in the finance department.',
    );
  });

  it.each([
    ['not configured', {}],
    ['empty', { org: '', user: '' }],
  ])('contributes nothing when the prompts are %s', async (_label, prompts) => {
    const contribution = await buildCapability(prompts).contribute();

    expect(contribution.sections).toEqual([]);
  });
});

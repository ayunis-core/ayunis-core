import {
  ImproveSkillTextCommand,
  SkillTextField,
} from './improve-skill-text.command';
import { buildImproveSkillTextPrompt } from './improve-skill-text.prompt';

describe('skill rewrite language guidance', () => {
  it.each(['en', 'de'] as const)(
    'uses %s as fallback for unidentifiable input',
    (language) => {
      const prompt = buildImproveSkillTextPrompt(
        new ImproveSkillTextCommand({
          field: SkillTextField.TRIGGER,
          trigger: 'asdkfj qwpoeir zxcv',
          instructions: '',
          consumeTrialMessage: false,
          language,
        }),
      );
      expect(prompt).toContain(
        `If the language cannot be confidently determined, write in ${language === 'de' ? 'German' : 'English'}`,
      );
      expect(prompt).toContain(
        'Random characters, gibberish, numbers and punctuation are not evidence of English',
      );
      expect(prompt).toContain(
        'When the author’s text has an identifiable language, write in that language',
      );
    },
  );

  it('supports older clients without a UI language', () => {
    const prompt = buildImproveSkillTextPrompt(
      new ImproveSkillTextCommand({
        field: SkillTextField.INSTRUCTIONS,
        trigger: '',
        instructions: '12345',
        consumeTrialMessage: false,
      }),
    );
    expect(prompt).toContain(
      'If the language cannot be confidently determined, write in English',
    );
  });
});

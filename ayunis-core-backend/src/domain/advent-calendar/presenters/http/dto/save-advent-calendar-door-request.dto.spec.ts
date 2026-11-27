import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { SaveAdventCalendarDoorRequestDto } from './save-advent-calendar-door-request.dto';

const link = { kind: 'link', label: 'Marketplace', url: '/marketplace' };
const quiz = {
  kind: 'quiz',
  label: 'Quiz',
  question: 'Which file types can a knowledge base hold?',
  answers: ['PDF and Word', 'Only text'],
  correctAnswerIndex: 0,
};

function fieldErrors(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    return [
      ...Object.keys(error.constraints ?? {}).map((name) => `${field}:${name}`),
      ...fieldErrors(error.children ?? [], field),
    ];
  });
}

async function errorsFor(body: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(SaveAdventCalendarDoorRequestDto, {
    title: 'Knowledge bases',
    body: '',
    buttons: [],
    ...body,
  });
  return fieldErrors(await validate(dto, { whitelist: true }));
}

describe(SaveAdventCalendarDoorRequestDto.name, () => {
  it('accepts a door with a Vimeo video, a link and a quiz', async () => {
    expect(
      await errorsFor({
        vimeoUrl: 'https://vimeo.com/76979871/abc123',
        buttons: [link, quiz],
      }),
    ).toEqual([]);
  });

  it.each([
    [{ title: '   ' }, 'title:isNotEmpty'],
    [{ vimeoUrl: 'https://www.youtube.com/watch?v=1' }, 'vimeoUrl:isVimeoUrl'],
    [
      { buttons: [{ ...link, url: 'javascript:alert(1)' }] },
      'buttons.0.url:isLinkUrl',
    ],
    [
      { buttons: [{ ...link, url: '//evil.example' }] },
      'buttons.0.url:isLinkUrl',
    ],
    [{ buttons: [quiz, quiz] }, 'buttons:atMostOneQuiz'],
    [{ buttons: [link, link, link] }, 'buttons:arrayMaxSize'],
    [
      { buttons: [{ ...quiz, correctAnswerIndex: 2 }] },
      'buttons.0.correctAnswerIndex:isAnswerIndex',
    ],
    [
      { buttons: [{ ...quiz, answers: ['Only one'] }] },
      'buttons.0.answers:arrayMinSize',
    ],
    [
      { buttons: [{ ...quiz, answers: ['a', 'b', 'c', 'd', 'e'] }] },
      'buttons.0.answers:arrayMaxSize',
    ],
    [{ buttons: [{ kind: 'script', label: 'x' }] }, 'buttons.0.kind:isIn'],
  ])('rejects %j with a field error', async (body, expected) => {
    expect(await errorsFor(body)).toContain(expected);
  });

  it.each([[[[]]], [[null]], [['link']]])(
    'rejects a button that is not an object (%j), which would be stored as null',
    async (buttons) => {
      expect(await errorsFor({ buttons })).toContain('buttons:isObject');
    },
  );
});

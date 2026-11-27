import type { ValidationArguments, ValidationOptions } from 'class-validator';
import { registerDecorator } from 'class-validator';
import { AdventCalendarButtonKind } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import { isAdventCalendarLinkUrl } from 'src/domain/advent-calendar/domain/advent-calendar-button';
import { parseVimeoUrl } from 'src/domain/advent-calendar/domain/advent-calendar-media';

function constraint(
  name: string,
  validate: (value: unknown, args: ValidationArguments) => boolean,
  message: string,
) {
  return (options?: ValidationOptions) =>
    function (object: object, propertyName: string) {
      registerDecorator({
        name,
        target: object.constructor,
        propertyName,
        options: { message, ...options },
        validator: { validate },
      });
    };
}

export const IsVimeoUrl = constraint(
  'isVimeoUrl',
  (value) => typeof value === 'string' && parseVimeoUrl(value) !== null,
  '$property must be a vimeo.com or player.vimeo.com video URL',
);

export const IsAdventCalendarLinkUrl = constraint(
  'isLinkUrl',
  (value) => typeof value === 'string' && isAdventCalendarLinkUrl(value),
  '$property must be an http(s) URL or an in-app path starting with /',
);

export const AtMostOneQuiz = constraint(
  'atMostOneQuiz',
  (value) =>
    !Array.isArray(value) ||
    value.filter(
      (button: unknown) =>
        typeof button === 'object' &&
        button !== null &&
        (button as { kind?: unknown }).kind === AdventCalendarButtonKind.QUIZ,
    ).length <= 1,
  '$property may contain at most one quiz',
);

/** The index must point into the sibling `answers` array. */
export const IsAnswerIndex = constraint(
  'isAnswerIndex',
  (value, args) => {
    const { answers } = args.object as { answers?: unknown };
    return (
      Number.isInteger(value) &&
      Array.isArray(answers) &&
      (value as number) >= 0 &&
      (value as number) < answers.length
    );
  },
  '$property must be the index of one of the answers',
);

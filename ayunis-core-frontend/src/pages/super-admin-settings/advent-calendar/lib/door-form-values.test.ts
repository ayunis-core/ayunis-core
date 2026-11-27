import { describe, expect, it } from 'vitest';
import type { AdventCalendarDoorContentResponseDto } from '@ayunis/api-client/schemas';
import type { DoorFormFields } from '@/pages/super-admin-settings/advent-calendar/model/types';
import {
  correctAnswerAfterRemoving,
  doorImageAction,
  newDoorButton,
  toDoorFormValues,
  toSaveDoorRequest,
  uploadsImageBeforeText,
} from './door-form-values';
import { doorErrorKey, doorErrorPath } from './door-validation-errors';

const content: AdventCalendarDoorContentResponseDto = {
  title: 'Skills',
  body: 'Text',
  media: { type: 'vimeo', vimeoVideoId: '76979871', vimeoHash: 'a1b2c3' },
  buttons: [
    {
      kind: 'quiz',
      label: 'Quiz',
      question: 'Wie viele Türchen?',
      answers: ['12', '24'],
      correctAnswerIndex: 1,
      explanation: null,
    },
  ],
  updatedAt: '2026-11-27T10:00:00.000Z',
};

function values(overrides: Partial<DoorFormFields>): DoorFormFields {
  return { ...toDoorFormValues(null), title: 'Skills', ...overrides };
}

describe('door form values', () => {
  it('keeps the privacy hash of an unlisted video when the door is edited and saved again', () => {
    const request = toSaveDoorRequest(toDoorFormValues(content));

    expect(request.vimeoUrl).toBe('https://vimeo.com/76979871/a1b2c3');
  });

  it('does not send a Vimeo URL left over from video mode, which would replace the image', () => {
    const request = toSaveDoorRequest(
      values({ mediaKind: 'image', vimeoUrl: 'https://vimeo.com/1' }),
    );

    expect(request.vimeoUrl).toBeNull();
  });

  it('sends only the fields of each button kind and the answers as plain strings', () => {
    const link = { ...newDoorButton('link'), label: 'Los', url: ' /chat ' };
    link.prompt = 'left over from editing';
    const quiz = {
      ...newDoorButton('quiz'),
      label: 'Quiz',
      question: 'Frage',
      answers: [{ text: 'Ja' }, { text: 'Nein' }],
      correctAnswerIndex: 0,
    };

    expect(
      toSaveDoorRequest(values({ buttons: [link, quiz] })).buttons,
    ).toEqual([
      { kind: 'link', label: 'Los', url: '/chat' },
      {
        kind: 'quiz',
        label: 'Quiz',
        question: 'Frage',
        answers: ['Ja', 'Nein'],
        correctAnswerIndex: 0,
        explanation: null,
      },
    ]);
  });

  it('sends a quiz without a correct answer as an index the server rejects', () => {
    const quiz = { ...newDoorButton('quiz'), correctAnswerIndex: null };

    expect(toSaveDoorRequest(values({ buttons: [quiz] })).buttons[0]).toEqual(
      expect.objectContaining({ correctAnswerIndex: -1 }),
    );
  });
});

describe('doorImageAction', () => {
  const file = new File(['x'], 'door.png', { type: 'image/png' });

  it('uploads a newly picked image', () => {
    expect(
      doorImageAction(values({ mediaKind: 'image', imageFile: file }), 'image'),
    ).toBe('upload');
  });

  it('keeps the stored image while image mode is kept without a new file', () => {
    expect(
      doorImageAction(
        values({ mediaKind: 'image', keepSavedImage: true }),
        'image',
      ),
    ).toBeNull();
  });

  it('removes the stored image when the door is switched to no media', () => {
    expect(
      doorImageAction(
        values({ mediaKind: 'none', keepSavedImage: true }),
        'image',
      ),
    ).toBe('remove');
  });

  it('removes the stored image when it was removed in the editor', () => {
    expect(
      doorImageAction(
        values({ mediaKind: 'image', keepSavedImage: false }),
        'image',
      ),
    ).toBe('remove');
  });

  it('leaves a video alone, since saving it already replaced the image', () => {
    expect(doorImageAction(values({ mediaKind: 'vimeo' }), 'vimeo')).toBeNull();
  });
});

describe('uploadsImageBeforeText', () => {
  const file = new File(['x'], 'door.png', { type: 'image/png' });

  it('uploads the new image of a saved door before its text, so a failed upload keeps its video', () => {
    expect(
      uploadsImageBeforeText(
        values({ mediaKind: 'image', imageFile: file }),
        true,
      ),
    ).toBe(true);
  });

  it('saves the text of a new door first, since an image needs a door with content', () => {
    expect(
      uploadsImageBeforeText(
        values({ mediaKind: 'image', imageFile: file }),
        false,
      ),
    ).toBe(false);
  });
});

describe('correctAnswerAfterRemoving', () => {
  it('keeps the same answer marked when an answer above it is removed', () => {
    expect(correctAnswerAfterRemoving(2, 0)).toBe(1);
  });

  it('keeps the index when an answer below it is removed', () => {
    expect(correctAnswerAfterRemoving(1, 3)).toBe(1);
  });

  it('unmarks the quiz when the correct answer itself is removed', () => {
    expect(correctAnswerAfterRemoving(1, 1)).toBeNull();
  });
});

describe('door validation errors', () => {
  it('words an error on the second button like one on the first', () => {
    expect(doorErrorKey('buttons.1.url')).toBe('buttons.url');
    expect(doorErrorPath('buttons.1.url')).toBe('buttons.1.url');
  });

  it('puts errors on the button and answer lists on their field-array root', () => {
    expect(doorErrorPath('buttons')).toBe('buttons.root');
    expect(doorErrorPath('buttons.0.answers')).toBe('buttons.0.answers.root');
    expect(doorErrorKey('buttons.0.answers')).toBe('buttons.answers');
  });
});

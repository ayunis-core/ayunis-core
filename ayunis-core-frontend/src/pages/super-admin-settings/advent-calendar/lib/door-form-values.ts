import type {
  AdventCalendarDoorContentResponseDto,
  AdventCalendarDoorMediaResponseDto,
  AdventCalendarLinkButtonDto,
  AdventCalendarPromptButtonDto,
  AdventCalendarQuizButtonDto,
  AdventCalendarMediaType,
  SaveAdventCalendarDoorRequestDto,
} from '@ayunis/api-client/schemas';
import { DOOR_QUIZ_MIN_ANSWERS } from '@/pages/super-admin-settings/advent-calendar/model/constants';
import type {
  DoorButtonFields,
  DoorButtonKind,
  DoorFormFields,
} from '@/pages/super-admin-settings/advent-calendar/model/types';

type DoorButtonDto =
  | AdventCalendarLinkButtonDto
  | AdventCalendarPromptButtonDto
  | AdventCalendarQuizButtonDto;

export type DoorImageAction = 'upload' | 'remove' | null;

export function newDoorButton(kind: DoorButtonKind): DoorButtonFields {
  return {
    kind,
    label: '',
    url: '',
    prompt: '',
    question: '',
    answers: Array.from({ length: DOOR_QUIZ_MIN_ANSWERS }, () => ({
      text: '',
    })),
    correctAnswerIndex: null,
    explanation: '',
  };
}

function vimeoUrlOf(media: AdventCalendarDoorMediaResponseDto): string {
  if (!media.vimeoVideoId) return '';
  const hash = media.vimeoHash ? `/${media.vimeoHash}` : '';
  return `https://vimeo.com/${media.vimeoVideoId}${hash}`;
}

function toButtonFields(button: DoorButtonDto): DoorButtonFields {
  const fields = { ...newDoorButton(button.kind), label: button.label };
  switch (button.kind) {
    case 'link':
      return { ...fields, url: button.url };
    case 'prompt':
      return { ...fields, prompt: button.prompt };
    case 'quiz':
      return {
        ...fields,
        question: button.question,
        answers: button.answers.map((text) => ({ text })),
        correctAnswerIndex: button.correctAnswerIndex,
        explanation: button.explanation ?? '',
      };
  }
}

export function toDoorFormValues(
  content: AdventCalendarDoorContentResponseDto | null,
): DoorFormFields {
  const media = content?.media ?? null;
  return {
    title: content?.title ?? '',
    body: content?.body ?? '',
    mediaKind: media?.type ?? 'none',
    vimeoUrl: media?.type === 'vimeo' ? vimeoUrlOf(media) : '',
    imageFile: null,
    keepSavedImage: media?.type === 'image',
    buttons: (content?.buttons ?? []).map(toButtonFields),
  };
}

function toButtonDto(button: DoorButtonFields): DoorButtonDto {
  switch (button.kind) {
    case 'link':
      return { kind: 'link', label: button.label, url: button.url.trim() };
    case 'prompt':
      return { kind: 'prompt', label: button.label, prompt: button.prompt };
    case 'quiz':
      return {
        kind: 'quiz',
        label: button.label,
        question: button.question,
        answers: button.answers.map((answer) => answer.text),
        // No answer marked correct: -1 is rejected by the server as a
        // field error on correctAnswerIndex, like any other invalid index.
        correctAnswerIndex: button.correctAnswerIndex ?? -1,
        explanation: button.explanation.trim() || null,
      };
  }
}

export function toSaveDoorRequest(
  values: DoorFormFields,
): SaveAdventCalendarDoorRequestDto {
  return {
    title: values.title,
    body: values.body,
    vimeoUrl: values.mediaKind === 'vimeo' ? values.vimeoUrl.trim() : null,
    buttons: values.buttons.map(toButtonDto),
  };
}

/**
 * What to do with the door's image once its text is saved. Saving without a
 * Vimeo URL keeps a stored image, so leaving image mode must remove it.
 */
export function doorImageAction(
  values: DoorFormFields,
  savedMediaType: AdventCalendarMediaType | undefined,
): DoorImageAction {
  if (values.mediaKind === 'image' && values.imageFile) return 'upload';
  const keepsImage = values.mediaKind === 'image' && values.keepSavedImage;
  if (savedMediaType === 'image' && !keepsImage) return 'remove';
  return null;
}

/**
 * Saving the text in image mode drops a stored video, so a saved door gets its
 * new image first: a failed upload then leaves the door as it was. A new door
 * has no content to upload an image to yet.
 */
export function uploadsImageBeforeText(
  values: DoorFormFields,
  hasSavedContent: boolean,
): boolean {
  return hasSavedContent && values.mediaKind === 'image' && !!values.imageFile;
}

/** Where the correct answer moves when the answer at `removed` is deleted. */
export function correctAnswerAfterRemoving(
  correct: number | null,
  removed: number,
): number | null {
  if (correct === null || correct === removed) return null;
  return correct > removed ? correct - 1 : correct;
}

export type DoorMediaKind = 'none' | 'image' | 'vimeo';

export type DoorButtonKind = 'link' | 'prompt' | 'quiz';

export interface DoorQuizAnswerFields {
  text: string;
}

/**
 * One button of any kind. The fields of the other kinds are kept while the
 * button is edited and dropped when the door is saved; their names match the
 * request DTO so the backend's field errors land on them.
 */
export interface DoorButtonFields {
  kind: DoorButtonKind;
  label: string;
  url: string;
  prompt: string;
  question: string;
  answers: DoorQuizAnswerFields[];
  correctAnswerIndex: number | null;
  explanation: string;
}

export interface DoorFormFields {
  title: string;
  body: string;
  mediaKind: DoorMediaKind;
  vimeoUrl: string;
  /** A new image to upload when the door is saved. */
  imageFile: File | null;
  /** False once the saved image was removed in the editor. */
  keepSavedImage: boolean;
  buttons: DoorButtonFields[];
}

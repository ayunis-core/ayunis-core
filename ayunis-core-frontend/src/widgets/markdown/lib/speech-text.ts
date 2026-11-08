/**
 * Marks a rendered node whose spoken form differs from its visible text: the
 * attribute value replaces the node when a message is read aloud, and an
 * empty value leaves it out. Renderers write the attribute literally.
 */
export const SPEECH_TEXT_ATTRIBUTE = 'data-speech-text';

import { Highlight } from '@tiptap/extension-highlight';
import {
  BackgroundColor,
  Color,
  TextStyle,
} from '@tiptap/extension-text-style';

// Only parses and renders <mark>: the stock `==text==` input/paste rules and
// Mod-Shift-h would turn ordinary text like `a == b == c` into highlights.
const PreservedHighlight = Highlight.extend({
  addInputRules: () => [],
  addPasteRules: () => [],
  addKeyboardShortcuts: () => ({}),
});

/**
 * Preserves the color coding the assistant writes (e.g. redline comparisons).
 * Without these TipTap drops colored spans and <mark> on load, and the next
 * save or export persists the stripped HTML.
 */
export const TEXT_COLOR_EXTENSIONS = [
  TextStyle,
  Color,
  BackgroundColor,
  PreservedHighlight,
];

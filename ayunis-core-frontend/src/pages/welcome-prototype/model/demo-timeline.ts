import type { FeatureDemo } from './feature-demos';

export const DEMO_ORDER = [
  'idle',
  'user',
  'thinking',
  'answer',
  'result',
  'highlight',
  'panel',
  'exports',
] as const;

export type DemoPhase = (typeof DEMO_ORDER)[number];

const WORD_MS = 30;
const HOLD_MS = 4500;
const ANSWER_AT = 3900;

export function hasAction(demo: FeatureDemo) {
  const kind = demo.result?.kind;
  return kind === 'document' || kind === 'spreadsheet' || kind === 'routine';
}

export function buildDemoTimeline(demo: FeatureDemo) {
  const words = demo.answer.split(' ').length;
  const resultAt = ANSWER_AT + words * WORD_MS + 900;
  const steps: Array<readonly [DemoPhase, number]> = [
    ['user', 1100],
    ['thinking', 2200],
    ['answer', ANSWER_AT],
    ['result', resultAt],
  ];
  if (!hasAction(demo)) {
    const highlightAt = resultAt + 1400;
    steps.push(['highlight', highlightAt]);
    return { steps, total: highlightAt + HOLD_MS };
  }
  const pressAt = resultAt + 1300;
  const panelAt = pressAt + 450;
  const exportsAt = panelAt + 1800;
  steps.push(
    ['highlight', pressAt],
    ['panel', panelAt],
    ['exports', exportsAt],
  );
  return { steps, total: exportsAt + HOLD_MS };
}

export function hasReached(phase: DemoPhase, target: DemoPhase) {
  return DEMO_ORDER.indexOf(phase) >= DEMO_ORDER.indexOf(target);
}

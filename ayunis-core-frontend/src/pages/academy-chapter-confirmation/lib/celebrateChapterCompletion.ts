import confetti from 'canvas-confetti';

export function celebrateChapterCompletion(): void {
  const shared = {
    particleCount: 80,
    spread: 70,
    startVelocity: 45,
    disableForReducedMotion: true,
  };
  void confetti({ ...shared, angle: 60, origin: { x: 0, y: 0.7 } });
  void confetti({ ...shared, angle: 120, origin: { x: 1, y: 0.7 } });
}

import confetti from 'canvas-confetti';

// canvas-confetti only takes hex colours: candlelight gold and snow white.
const SPARKLE_COLORS = ['#fff6d5', '#ffd86b', '#f5b942', '#ffffff'];

export function sparkleFrom(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  void confetti({
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    shapes: ['star'],
    colors: SPARKLE_COLORS,
    particleCount: 36,
    spread: 360,
    startVelocity: 14,
    gravity: 0.5,
    decay: 0.9,
    ticks: 90,
    scalar: 0.75,
  });
}

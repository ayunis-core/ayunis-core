import { useEffect, useRef } from 'react';

const SPACING = 11;
const DOT_RADIUS = 0.8;
const FRAME_INTERVAL = 33;

interface BlobConfig {
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  rangeX: number;
  rangeY: number;
  radius: number;
  opacity: number;
}

const BLOBS: BlobConfig[] = [
  {
    speedX: 0.18,
    speedY: 0.14,
    phaseX: 0,
    phaseY: 0,
    rangeX: 0.35,
    rangeY: 0.3,
    radius: 0.7,
    opacity: 1,
  },
  {
    speedX: 0.13,
    speedY: 0.1,
    phaseX: 2.1,
    phaseY: 1.3,
    rangeX: 0.4,
    rangeY: 0.32,
    radius: 0.6,
    opacity: 1,
  },
  {
    speedX: 0.15,
    speedY: 0.19,
    phaseX: 4.2,
    phaseY: 3.5,
    rangeX: 0.3,
    rangeY: 0.26,
    radius: 0.65,
    opacity: 0.95,
  },
  {
    speedX: 0.11,
    speedY: 0.16,
    phaseX: 1.0,
    phaseY: 5.0,
    rangeX: 0.36,
    rangeY: 0.3,
    radius: 0.55,
    opacity: 0.9,
  },
];

function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

function fadeColor(alpha: number): string {
  const c = isDarkMode() ? '9,9,11' : '255,255,255';
  return `rgba(${c},${alpha})`;
}

function getDotColor(): string {
  return isDarkMode() ? 'rgba(180,175,200,0.25)' : 'rgba(120,115,140,0.55)';
}

function getBlobColor(opacity: number): string {
  return isDarkMode()
    ? `rgba(9,9,11,${opacity})`
    : `rgba(255,255,255,${opacity})`;
}

function createBlobCanvas(size: number, opacity: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, getBlobColor(opacity));
  g.addColorStop(0.3, getBlobColor(opacity * 0.7));
  g.addColorStop(0.6, getBlobColor(opacity * 0.3));
  g.addColorStop(0.85, getBlobColor(opacity * 0.08));
  g.addColorStop(1, getBlobColor(0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function drawStaticGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): ImageData {
  ctx.clearRect(0, 0, w, h);
  const dotColor = getDotColor();
  for (let y = 0; y < h + SPACING; y += SPACING) {
    for (let x = 0; x < w + SPACING; x += SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, 6.283);
      ctx.fillStyle = dotColor;
      ctx.fill();
    }
  }
  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawEdgeFade(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fade = 120;

  const top = ctx.createLinearGradient(0, 0, 0, fade);
  top.addColorStop(0, fadeColor(1));
  top.addColorStop(1, fadeColor(0));
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, fade);

  const bottom = ctx.createLinearGradient(0, h - fade, 0, h);
  bottom.addColorStop(0, fadeColor(0));
  bottom.addColorStop(1, fadeColor(1));
  ctx.fillStyle = bottom;
  ctx.fillRect(0, h - fade, w, fade);

  const left = ctx.createLinearGradient(0, 0, fade, 0);
  left.addColorStop(0, fadeColor(1));
  left.addColorStop(1, fadeColor(0));
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, fade, h);

  const right = ctx.createLinearGradient(w - fade, 0, w, 0);
  right.addColorStop(0, fadeColor(0));
  right.addColorStop(1, fadeColor(1));
  ctx.fillStyle = right;
  ctx.fillRect(w - fade, 0, fade, h);
}

export default function OnboardingPageBg() {
  const ref = useRef<HTMLCanvasElement>(null);
  const running = useRef(true);

  useEffect(() => {
    running.current = true;
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const dpr = window.devicePixelRatio || 1;
    let w = parent.clientWidth;
    let h = parent.clientHeight;

    function resize() {
      w = parent!.clientWidth;
      h = parent!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function buildCenterGradient(targetCtx: CanvasRenderingContext2D) {
      const cg = targetCtx.createRadialGradient(
        w * 0.5,
        h * 0.22,
        0,
        w * 0.5,
        h * 0.22,
        w * 0.3,
      );
      cg.addColorStop(0, fadeColor(0.85));
      cg.addColorStop(0.5, fadeColor(0.4));
      cg.addColorStop(1, fadeColor(0));
      targetCtx.fillStyle = cg;
      targetCtx.fillRect(0, 0, w, h);
    }

    resize();
    let gridImage = drawStaticGrid(ctx, w, h);

    let blobCanvases = BLOBS.map((b) => {
      const size = Math.round(Math.max(w, h) * b.radius * 2);
      return createBlobCanvas(size, b.opacity);
    });

    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = w * dpr;
    edgeCanvas.height = h * dpr;
    const edgeCtx = edgeCanvas.getContext('2d')!;
    edgeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawEdgeFade(edgeCtx, w, h);

    const centerCanvas = document.createElement('canvas');
    centerCanvas.width = w * dpr;
    centerCanvas.height = h * dpr;
    const centerCtx = centerCanvas.getContext('2d')!;
    centerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildCenterGradient(centerCtx);

    const rebuildAll = () => {
      resize();
      gridImage = drawStaticGrid(ctx, w, h);
      blobCanvases = BLOBS.map((b) => {
        const size = Math.round(Math.max(w, h) * b.radius * 2);
        return createBlobCanvas(size, b.opacity);
      });
      edgeCanvas.width = w * dpr;
      edgeCanvas.height = h * dpr;
      edgeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawEdgeFade(edgeCtx, w, h);
      centerCanvas.width = w * dpr;
      centerCanvas.height = h * dpr;
      centerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildCenterGradient(centerCtx);
    };

    const drawStaticFrame = () => {
      ctx.putImageData(gridImage, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(edgeCanvas, 0, 0, w, h);
      ctx.drawImage(centerCanvas, 0, 0, w, h);
    };

    if (prefersReducedMotion) {
      drawStaticFrame();
      const onResize = () => {
        rebuildAll();
        drawStaticFrame();
      };
      window.addEventListener('resize', onResize);
      return () => {
        running.current = false;
        window.removeEventListener('resize', onResize);
      };
    }

    window.addEventListener('resize', rebuildAll);

    const themeObserver = new MutationObserver(() => rebuildAll());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    let lastFrame = 0;

    const tick = (ms: number) => {
      if (!running.current) return;
      requestAnimationFrame(tick);

      if (ms - lastFrame < FRAME_INTERVAL) return;
      lastFrame = ms;

      const t = ms * 0.001;

      ctx.putImageData(gridImage, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (let i = 0; i < BLOBS.length; i++) {
        const b = BLOBS[i];
        const bc = blobCanvases[i];
        const blobSize = bc.width / dpr;
        const cx = w * 0.5 + Math.sin(t * b.speedX + b.phaseX) * w * b.rangeX;
        const cy = h * 0.5 + Math.cos(t * b.speedY + b.phaseY) * h * b.rangeY;
        ctx.drawImage(
          bc,
          cx - blobSize / 2,
          cy - blobSize / 2,
          blobSize,
          blobSize,
        );
      }

      ctx.drawImage(edgeCanvas, 0, 0, w, h);
      ctx.drawImage(centerCanvas, 0, 0, w, h);
    };

    requestAnimationFrame(tick);

    return () => {
      running.current = false;
      window.removeEventListener('resize', rebuildAll);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-xl">
      <canvas ref={ref} />
    </div>
  );
}

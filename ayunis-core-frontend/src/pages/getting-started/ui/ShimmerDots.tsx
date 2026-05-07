import { useEffect, useRef } from 'react';

const SPACING = 11;
const DOT_RADIUS = 0.8;
const DOT_COLOR = 'rgba(120,115,140,0.55)';
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
    speedX: 0.35,
    speedY: 0.28,
    phaseX: 0,
    phaseY: 0,
    rangeX: 0.4,
    rangeY: 0.35,
    radius: 0.38,
    opacity: 1,
  },
  {
    speedX: 0.25,
    speedY: 0.2,
    phaseX: 2.1,
    phaseY: 1.3,
    rangeX: 0.45,
    rangeY: 0.38,
    radius: 0.32,
    opacity: 1,
  },
  {
    speedX: 0.3,
    speedY: 0.38,
    phaseX: 4.2,
    phaseY: 3.5,
    rangeX: 0.35,
    rangeY: 0.3,
    radius: 0.35,
    opacity: 0.95,
  },
  {
    speedX: 0.22,
    speedY: 0.3,
    phaseX: 1.0,
    phaseY: 5.0,
    rangeX: 0.42,
    rangeY: 0.36,
    radius: 0.28,
    opacity: 0.9,
  },
  {
    speedX: 0.4,
    speedY: 0.18,
    phaseX: 3.0,
    phaseY: 2.0,
    rangeX: 0.38,
    rangeY: 0.32,
    radius: 0.25,
    opacity: 0.85,
  },
];

function createBlobCanvas(size: number, opacity: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, `rgba(255,255,255,${opacity})`);
  g.addColorStop(0.4, `rgba(255,255,255,${opacity * 0.6})`);
  g.addColorStop(0.75, `rgba(255,255,255,${opacity * 0.15})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
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
  for (let y = 0; y < h + SPACING; y += SPACING) {
    for (let x = 0; x < w + SPACING; x += SPACING) {
      ctx.beginPath();
      ctx.arc(x, y, DOT_RADIUS, 0, 6.283);
      ctx.fillStyle = DOT_COLOR;
      ctx.fill();
    }
  }
  return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawEdgeFade(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fade = 120;

  const top = ctx.createLinearGradient(0, 0, 0, fade);
  top.addColorStop(0, 'rgba(255,255,255,1)');
  top.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, fade);

  const bottom = ctx.createLinearGradient(0, h - fade, 0, h);
  bottom.addColorStop(0, 'rgba(255,255,255,0)');
  bottom.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, h - fade, w, fade);

  const left = ctx.createLinearGradient(0, 0, fade, 0);
  left.addColorStop(0, 'rgba(255,255,255,1)');
  left.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, fade, h);

  const right = ctx.createLinearGradient(w - fade, 0, w, 0);
  right.addColorStop(0, 'rgba(255,255,255,0)');
  right.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = right;
  ctx.fillRect(w - fade, 0, fade, h);
}

export default function ShimmerDots() {
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
    const cg = centerCtx.createRadialGradient(
      w * 0.5,
      h * 0.22,
      0,
      w * 0.5,
      h * 0.22,
      w * 0.3,
    );
    cg.addColorStop(0, 'rgba(255,255,255,0.85)');
    cg.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    cg.addColorStop(1, 'rgba(255,255,255,0)');
    centerCtx.fillStyle = cg;
    centerCtx.fillRect(0, 0, w, h);

    const onResize = () => {
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
      const cg2 = centerCtx.createRadialGradient(
        w * 0.5,
        h * 0.22,
        0,
        w * 0.5,
        h * 0.22,
        w * 0.3,
      );
      cg2.addColorStop(0, 'rgba(255,255,255,0.85)');
      cg2.addColorStop(0.5, 'rgba(255,255,255,0.4)');
      cg2.addColorStop(1, 'rgba(255,255,255,0)');
      centerCtx.fillStyle = cg2;
      centerCtx.fillRect(0, 0, w, h);
    };
    window.addEventListener('resize', onResize);

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
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <canvas ref={ref} />
    </div>
  );
}

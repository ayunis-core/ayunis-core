import { cn } from '@/shared/lib/shadcn/utils';

import { useSnippetRotation } from '../../hooks/useSnippetRotation';

const snippets = [
  { de: 'Farben mischen', en: 'Mixing colors' },
  { de: 'Leinwand aufspannen', en: 'Stretching the canvas' },
  { de: 'Skizze anfertigen', en: 'Sketching the outline' },
  { de: 'Komposition wählen', en: 'Choosing the composition' },
  { de: 'Pinsel auswählen', en: 'Selecting the brush' },
  { de: 'Pigmente anrühren', en: 'Preparing pigments' },
  { de: 'Erste Schicht auftragen', en: 'Applying the first layer' },
  { de: 'Glanzlichter setzen', en: 'Adding highlights' },
  { de: 'Schatten verblenden', en: 'Blending shadows' },
  { de: 'Feinheiten ausarbeiten', en: 'Working out the details' },
  { de: 'Kontraste schärfen', en: 'Sharpening contrasts' },
  { de: 'Palette abstimmen', en: 'Harmonizing the palette' },
  { de: 'Licht komponieren', en: 'Composing the light' },
  { de: 'Texturen rendern', en: 'Rendering textures' },
  { de: 'Motiv einrahmen', en: 'Framing the subject' },
  { de: 'Perspektive prüfen', en: 'Checking perspective' },
  { de: 'Proportionen justieren', en: 'Adjusting proportions' },
  { de: 'Firnis auftragen', en: 'Applying the varnish' },
] as const;

interface ImageGenerationLoaderProps {
  readonly prompt?: string;
}

export default function ImageGenerationLoader({
  prompt,
}: ImageGenerationLoaderProps) {
  const { displayText, isVisible } = useSnippetRotation({
    snippets,
    intervalMs: 3500,
    fadeMs: 180,
  });

  return (
    <div className="my-2 w-full max-w-md rounded-lg border bg-card p-3">
      <style>{`
        @keyframes paint-float-a {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(18%, 12%) scale(1.2); }
        }
        @keyframes paint-float-b {
          0%, 100% { transform: translate(0%, 0%) scale(1.1); }
          50% { transform: translate(-14%, 16%) scale(0.95); }
        }
        @keyframes paint-float-c {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(14%, -12%) scale(1.2); }
        }
        @keyframes paint-float-d {
          0%, 100% { transform: translate(0%, 0%) scale(1.05); }
          50% { transform: translate(-18%, -14%) scale(0.9); }
        }
        @keyframes paint-shimmer {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(260%) skewX(-18deg); opacity: 0; }
        }
        .paint-blob {
          position: absolute;
          border-radius: 9999px;
          filter: blur(28px);
          opacity: 0.55;
          will-change: transform;
        }
      `}</style>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-gradient-to-br from-muted/40 to-muted">
        <div
          className="paint-blob"
          style={{
            width: '65%',
            height: '65%',
            top: '-12%',
            left: '-12%',
            background: '#EB9169',
            animation: 'paint-float-a 6s ease-in-out infinite',
          }}
        />
        <div
          className="paint-blob"
          style={{
            width: '60%',
            height: '60%',
            top: '-8%',
            right: '-12%',
            background: '#8F81E2',
            animation: 'paint-float-b 7s ease-in-out infinite',
            animationDelay: '-1.2s',
          }}
        />
        <div
          className="paint-blob"
          style={{
            width: '60%',
            height: '60%',
            bottom: '-12%',
            left: '-8%',
            background: '#596D6B',
            animation: 'paint-float-c 8s ease-in-out infinite',
            animationDelay: '-2.4s',
          }}
        />
        <div
          className="paint-blob"
          style={{
            width: '65%',
            height: '65%',
            bottom: '-12%',
            right: '-10%',
            background: '#B5A9EB',
            animation: 'paint-float-d 7s ease-in-out infinite',
            animationDelay: '-3.6s',
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          style={{ animation: 'paint-shimmer 3s ease-in-out infinite' }}
        />
      </div>

      <div className="mt-3 px-1">
        <p
          className={cn(
            'text-sm font-medium transition-opacity duration-200',
            isVisible ? 'opacity-100' : 'opacity-0',
          )}
        >
          {displayText}…
        </p>
        {prompt && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {prompt}
          </p>
        )}
      </div>
    </div>
  );
}

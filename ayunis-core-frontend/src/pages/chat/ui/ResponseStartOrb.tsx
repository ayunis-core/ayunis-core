import { AyunisProgressOrb } from '@/widgets/ayunis-progress-orb';

/**
 * Loading orb occupying the exact spot where the first line of assistant
 * text will render: h-6 matches the prose-sm line box (24px), and -ml-1
 * compensates the orb shell's 4px inset so the disc's left edge sits at
 * the first letter's x-position.
 */
export default function ResponseStartOrb() {
  return (
    <div className="flex h-6 items-center">
      <AyunisProgressOrb
        isActive
        className="-ml-1"
        aria-label="Ayunis arbeitet"
      />
    </div>
  );
}

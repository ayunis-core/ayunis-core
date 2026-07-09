import { AyunisProgressOrb } from '@/widgets/ayunis-progress-orb';

export default function LoadingAssistantBlock() {
  return (
    <div className="flex flex-col items-start gap-2 mt-4">
      <AyunisProgressOrb isActive aria-label="Ayunis arbeitet" />
    </div>
  );
}

import { showInfo } from '@/shared/lib/toast';

export function notifyUnlinked(unlinkedCount: number, ownerName?: string) {
  if (unlinkedCount === 0) return;
  showInfo(
    ownerName
      ? `Die eigenen Fähigkeiten und Wissenssammlungen von ${ownerName} sind hier nicht mehr verknüpft.`
      : 'Eigene Fähigkeiten und Wissenssammlungen von Personen ohne Zugriff sind hier nicht mehr verknüpft.',
  );
}

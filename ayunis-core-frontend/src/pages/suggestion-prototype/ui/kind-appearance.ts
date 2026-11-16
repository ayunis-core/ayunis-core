import { Brain, Plug, Sparkles, type LucideIcon } from 'lucide-react';
import type { SuggestionKind } from '@/pages/suggestion-prototype/model/scenarios';

export interface KindAppearance {
  icon: LucideIcon;
  action: string;
  pending: string;
  result: string;
  open: string;
  secondary?: string;
  dismissed: string;
  canUndoDismiss: boolean;
  alwaysAllowFirst?: boolean;
}

export const KIND_APPEARANCE: Record<SuggestionKind, KindAppearance> = {
  skill: {
    icon: Sparkles,
    action: 'Speichern',
    pending: 'Wird gespeichert…',
    result: 'Fähigkeit gespeichert',
    open: 'Fähigkeit öffnen',
    secondary: 'Anpassen',
    dismissed: 'Abgelehnt. Ayunis Core schlägt diese Fähigkeit nicht mehr vor.',
    canUndoDismiss: true,
  },
  integration: {
    icon: Plug,
    action: 'Verbinden',
    pending: 'Wird verbunden…',
    result: 'Integration verbunden',
    open: 'Integration öffnen',
    dismissed:
      'Abgelehnt. Ayunis Core fragt nicht mehr nach dieser Integration.',
    canUndoDismiss: true,
  },
  knowledge: {
    icon: Brain,
    action: 'Hinzufügen',
    pending: 'Wird hinzugefügt…',
    result: 'Zur Wissensdatenbank hinzugefügt',
    open: 'Wissensdatenbank öffnen',
    dismissed: 'Abgelehnt. Ayunis Core schlägt das nicht mehr vor.',
    canUndoDismiss: true,
  },
  confirm: {
    icon: Plug,
    action: 'Immer erlauben',
    pending: 'Wird ausgeführt…',
    result: 'Deal aktualisiert',
    open: 'In HubSpot öffnen',
    secondary: 'Nur dieses Mal',
    alwaysAllowFirst: true,
    dismissed: 'Abgelehnt. Ayunis Core hat nichts geändert.',
    canUndoDismiss: false,
  },
};

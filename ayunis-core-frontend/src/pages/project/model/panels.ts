import { Sparkles, Brain, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PanelKey = 'skills' | 'knowledge' | 'output';

export const PANEL_ORDER: PanelKey[] = ['skills', 'knowledge', 'output'];

export const PANELS: Record<PanelKey, { label: string; icon: LucideIcon }> = {
  skills: { label: 'Skills', icon: Sparkles },
  knowledge: { label: 'Wissen', icon: Brain },
  output: { label: 'Erstellte Inhalte', icon: FileText },
};

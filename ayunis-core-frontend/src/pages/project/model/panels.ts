import { FEATURES } from '@/entities/project';
import { Sparkles, Brain, FileText } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PanelKey = 'skills' | 'knowledge' | 'output';

export const PANEL_ORDER: PanelKey[] = [
  ...(FEATURES.skillsAndKnowledge
    ? (['skills', 'knowledge'] as PanelKey[])
    : []),
  ...(FEATURES.artifacts ? (['output'] as PanelKey[]) : []),
];

export const PANELS: Record<PanelKey, { label: string; icon: LucideIcon }> = {
  skills: { label: 'Fähigkeiten', icon: Sparkles },
  knowledge: { label: 'Wissen', icon: Brain },
  output: { label: 'Erstellte Inhalte', icon: FileText },
};

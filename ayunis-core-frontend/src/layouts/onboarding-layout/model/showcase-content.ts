import { BadgeCheck, Gauge, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import calw from '@/shared/assets/brand/city-logos/calw.png';
import herzebrockClarholz from '@/shared/assets/brand/city-logos/herzebrock-clarholz.png';
import maulburg from '@/shared/assets/brand/city-logos/maulburg.png';
import petersberg from '@/shared/assets/brand/city-logos/petersberg.png';
import schramberg from '@/shared/assets/brand/city-logos/schramberg.png';
import weissach from '@/shared/assets/brand/city-logos/weissach.png';

export const CUSTOMER_COUNT = 800;

export const APPEAR_DELAY_MS = 600;

export const SLIDE_KEYS = ['report', 'email', 'stats'];

export interface DocumentUseCase {
  id: string;
  shortPromptKey: string;
  kind: 'document';
  messageKey: string;
  docNameKey: string;
  docKindKey: string;
}

export interface EmailUseCase {
  id: string;
  shortPromptKey: string;
  kind: 'email';
  recipientKey: string;
  subjectKey: string;
  bodyKey: string;
  sentKey: string;
}

export type ChatUseCase = DocumentUseCase | EmailUseCase;

export const CHAT_USE_CASES: ChatUseCase[] = [
  {
    id: 'report',
    shortPromptKey: 'onboardingLayout.promptExample1',
    kind: 'document',
    messageKey: 'onboardingLayout.useReportMessage',
    docNameKey: 'onboardingLayout.useReportDoc',
    docKindKey: 'onboardingLayout.docKindPdf',
  },
  {
    id: 'email',
    shortPromptKey: 'onboardingLayout.promptExampleEmail',
    kind: 'email',
    recipientKey: 'onboardingLayout.emailRecipient',
    subjectKey: 'onboardingLayout.emailSubject',
    bodyKey: 'onboardingLayout.emailBody',
    sentKey: 'onboardingLayout.emailSent',
  },
];

export interface TrustBadge {
  icon: LucideIcon;
  labelKey: string;
}

export const TRUST_BADGES: TrustBadge[] = [
  { icon: ShieldCheck, labelKey: 'onboardingLayout.badgeGdpr' },
  { icon: BadgeCheck, labelKey: 'onboardingLayout.badgeIso' },
  { icon: Gauge, labelKey: 'onboardingLayout.badgeOzg' },
];

export const CITY_LOGOS: { src: string; name: string }[] = [
  { src: calw, name: 'Calw' },
  { src: herzebrockClarholz, name: 'Herzebrock-Clarholz' },
  { src: maulburg, name: 'Maulburg' },
  { src: petersberg, name: 'Petersberg' },
  { src: schramberg, name: 'Schramberg' },
  { src: weissach, name: 'Weissach' },
];

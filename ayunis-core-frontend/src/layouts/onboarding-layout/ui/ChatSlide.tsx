import { ArrowUp, FileText, Mail, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useChatPlay } from '../lib/useChatPlay';
import {
  APPEAR_DELAY_MS,
  type ChatUseCase,
  type DocumentUseCase,
  type EmailUseCase,
} from '../model/showcase-content';

function AnswerCard({ useCase }: Readonly<{ useCase: DocumentUseCase }>) {
  const { t } = useTranslation('auth');
  return (
    <div className="onboarding-fade rounded-2xl border border-white/15 bg-zinc-700/50 p-4 shadow-xl backdrop-blur-sm">
      <p className="text-sm leading-relaxed text-white">
        {t(useCase.messageKey)}
      </p>
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white">
          <FileText className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium text-white">
            {t(useCase.docNameKey)}
          </span>
          <span className="text-xs text-white/70">{t(useCase.docKindKey)}</span>
        </span>
      </div>
    </div>
  );
}

function EmailCard({ useCase }: Readonly<{ useCase: EmailUseCase }>) {
  const { t } = useTranslation('auth');
  return (
    <div className="onboarding-fade rounded-2xl border border-white/15 bg-zinc-700/50 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/70">
        <Mail className="h-4 w-4" strokeWidth={1.75} />
        <span className="text-xs font-medium">{t(useCase.recipientKey)}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-white">
        {t(useCase.subjectKey)}
      </p>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/75">
        {t(useCase.bodyKey)}
      </p>
    </div>
  );
}

function SentPill({ text }: Readonly<{ text: string }>) {
  return (
    <div className="onboarding-rise flex w-fit items-center gap-2.5 self-start rounded-2xl border border-white/15 bg-zinc-700/50 px-4 py-2.5 shadow-xl backdrop-blur-sm">
      <Send className="h-4 w-4 text-white" strokeWidth={1.75} />
      <span className="text-sm font-medium text-white">{text}</span>
    </div>
  );
}

function ChatResult({
  useCase,
  sent,
}: Readonly<{ useCase: ChatUseCase; sent: boolean }>) {
  const { t } = useTranslation('auth');
  if (useCase.kind === 'email') {
    return (
      <>
        <EmailCard useCase={useCase} />
        {sent && <SentPill text={t(useCase.sentKey)} />}
      </>
    );
  }
  return <AnswerCard useCase={useCase} />;
}

export function ChatSlide({
  useCase,
  active,
}: Readonly<{ useCase: ChatUseCase; active: boolean }>) {
  const { t } = useTranslation('auth');
  const { stage, typed } = useChatPlay(
    t(useCase.shortPromptKey),
    active,
    APPEAR_DELAY_MS,
  );
  const showResult = stage === 'answer' || stage === 'sent';

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      {stage !== 'typing' && (
        <div className="onboarding-rise max-w-[80%] self-end rounded-2xl rounded-br-md bg-white/90 px-4 py-2.5 text-sm text-zinc-700">
          {t(useCase.shortPromptKey)}
        </div>
      )}
      {stage === 'thinking' && (
        <span className="onboarding-rise onboarding-shimmer self-start px-1 text-sm font-medium [text-shadow:0_1px_8px_rgba(30,24,64,0.55)]">
          {t('onboardingLayout.analyzing')}
        </span>
      )}
      {showResult && <ChatResult useCase={useCase} sent={stage === 'sent'} />}

      <div className="flex items-center justify-between gap-2 rounded-full border border-white/15 bg-zinc-800/55 py-2 pl-5 pr-2 shadow-2xl">
        <span className="flex min-w-0 items-center text-sm text-white">
          <span className="truncate">{stage === 'typing' ? typed : ''}</span>
          <span className="ml-0.5 inline-block h-4 w-px shrink-0 animate-pulse bg-white" />
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/30 text-white">
          <ArrowUp className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

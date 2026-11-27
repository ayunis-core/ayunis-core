import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  History,
  useContentScrollHeader,
  type HistoryProps,
} from '@ayunis/chat/surface';
import { PaneHeading } from '@/outlook/ui/PaneHeading';

type PaneHistoryProps = Pick<
  HistoryProps,
  'config' | 'lifecycle' | 'onSelect'
> & {
  readonly onBack: () => void;
  readonly onSignOut: () => Promise<void>;
  readonly onError: (error: unknown) => void;
};

function HistoryHeader({
  onBack,
  onSignOut,
  onError,
}: Pick<PaneHistoryProps, 'onBack' | 'onSignOut' | 'onError'>) {
  const { t } = useTranslation('chats');
  return (
    <PaneHeading
      title={t('page.title')}
      actions={
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="embedded-back-to-start"
            onClick={onBack}
          >
            {t('page.embedded.backToStart')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-testid="embedded-sign-out"
            onClick={() => {
              void onSignOut().catch(onError);
            }}
          >
            {t('page.embedded.signOut')}
          </Button>
        </div>
      }
    />
  );
}

/** The pane's frame around the package history: its heading, then the chats. */
export function PaneChatHistory(props: PaneHistoryProps) {
  const [empty, setEmpty] = useState(false);
  const header = <HistoryHeader {...props} />;
  const history = (
    <History
      config={props.config}
      lifecycle={props.lifecycle}
      onSelect={props.onSelect}
      onEmptyChange={setEmpty}
    />
  );
  return empty ? (
    <EmptyHistoryFrame header={header}>{history}</EmptyHistoryFrame>
  ) : (
    <HistoryFrame header={header}>{history}</HistoryFrame>
  );
}

function EmptyHistoryFrame({
  header,
  children,
}: Readonly<{ header: ReactNode; children: ReactNode }>) {
  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="outlook-page-header">{header}</div>
      <div className="flex min-h-0 w-full flex-1 overflow-y-auto">
        <div className="m-auto flex w-full justify-center pb-20">
          {children}
        </div>
      </div>
    </div>
  );
}

function HistoryFrame({
  header,
  children,
}: Readonly<{ header: ReactNode; children: ReactNode }>) {
  const { scrollRef, headerScrolled, onScroll } = useContentScrollHeader();
  return (
    <div className="absolute inset-0 flex min-h-0 flex-col pb-4">
      <div className="content-scroll-region relative flex min-h-0 flex-1 flex-col">
        <div
          ref={scrollRef}
          className="content-scroll-viewport min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto"
          onScroll={onScroll}
        >
          <div className="content-scroll-header-offset" aria-hidden />
          <div className="mx-auto w-full min-w-0 max-w-[800px] px-1 pb-3 sm:px-2">
            {children}
          </div>
        </div>
        <div
          className="content-scroll-header"
          data-scrolled={headerScrolled ? 'true' : 'false'}
        >
          {header}
        </div>
      </div>
    </div>
  );
}

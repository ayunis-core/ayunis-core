import AppLayout from '@/layouts/app-layout';
import NewChatBackdrop from './NewChatBackdrop';

interface NewChatPageLayoutProps {
  header: React.ReactNode;
  children: React.ReactNode;
}

export default function NewChatPageLayout({
  header,
  children,
}: Readonly<NewChatPageLayoutProps>) {
  return (
    <AppLayout>
      <div className="absolute inset-0 overflow-hidden">
        <NewChatBackdrop />
        <div className="content-area-page-header">{header}</div>
        <div className="absolute inset-0 z-[1] flex items-center justify-center px-4">
          <div className="w-full max-w-[800px] flex flex-col gap-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-700 fill-mode-both [animation-delay:200ms]">
            {children}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

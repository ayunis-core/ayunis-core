import AppLayout from '@/layouts/app-layout';

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
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="flex-shrink-0 sticky top-0 z-10 bg-background w-full">
          {header}
        </div>
        <div className="w-full max-w-[800px] mx-auto my-auto flex flex-col gap-4 -translate-y-[30%]">
          {children}
        </div>
      </div>
    </AppLayout>
  );
}

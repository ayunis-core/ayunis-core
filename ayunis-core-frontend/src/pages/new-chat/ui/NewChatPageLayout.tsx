import AppLayout from "@/layouts/app-layout";

interface NewChatPageLayoutProps {
  children: React.ReactNode;
}

export default function NewChatPageLayout({
  children,
}: NewChatPageLayoutProps) {
  return (
    <AppLayout>
      <div className="w-full h-full flex flex-col items-center justify-center">
        <div className="w-full max-w-[800px] mx-auto my-auto flex flex-col gap-4 -translate-y-[30%]">
          {children}
        </div>
      </div>
    </AppLayout>
  );
}

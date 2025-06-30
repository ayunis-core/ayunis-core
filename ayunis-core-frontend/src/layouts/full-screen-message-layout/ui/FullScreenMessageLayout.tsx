interface FullScreenMessageLayoutProps {
  children: React.ReactNode;
  header: React.ReactNode;
}

export default function FullScreenMessageLayout({
  children,
  header,
}: FullScreenMessageLayoutProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 sticky top-0 z-10 bg-background w-full">
        {header}
      </div>
      <div className="flex flex-col h-full w-full mx-auto items-center justify-center -translate-y-[40px]">
        {children}
      </div>
    </div>
  );
}

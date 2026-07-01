interface FullScreenMessageLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
}

export default function FullScreenMessageLayout({
  children,
  header,
}: Readonly<FullScreenMessageLayoutProps>) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {header && <div className="content-area-page-header">{header}</div>}
      <div className="flex min-h-0 flex-1 w-full mx-auto items-center justify-center -translate-y-10">
        {children}
      </div>
    </div>
  );
}

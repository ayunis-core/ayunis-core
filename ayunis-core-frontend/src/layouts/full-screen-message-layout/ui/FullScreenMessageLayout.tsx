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
      <div className="flex min-h-0 w-full flex-1 overflow-y-auto">
        <div className="m-auto flex w-full justify-center pb-20">
          {children}
        </div>
      </div>
    </div>
  );
}

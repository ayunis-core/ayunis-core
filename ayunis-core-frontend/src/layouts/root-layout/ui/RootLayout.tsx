export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as
    | string
    | undefined;
  const plausibleSrc = import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined;

  return (
    <>
      {plausibleDomain && plausibleSrc && (
        <script async src={plausibleSrc} data-domain={plausibleDomain}></script>
      )}
      {children}
    </>
  );
}

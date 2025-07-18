export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const plausibleDomain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  const plausibleSrc = import.meta.env.VITE_PLAUSIBLE_SRC;

  return (
    <>
      {plausibleDomain && plausibleSrc && (
        <script async src={plausibleSrc} data-domain={plausibleDomain}></script>
      )}
      {children}
    </>
  );
}

// The Node-compatible legacy build ships no own declarations; reuse the
// package root types (same API surface).
declare module 'pdfjs-dist/legacy/build/pdf.js' {
  export * from 'pdfjs-dist';
}

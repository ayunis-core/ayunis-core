// Pinned to React 18.3.1 — the latest 18.x with official UMD builds on unpkg.
// React 19 dropped UMD bundles; re-evaluate when an alternative standalone
// bundle is available.
const REACT_URL = 'https://unpkg.com/react@18.3.1/umd/react.production.min.js';
const REACT_DOM_URL =
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js';
const BABEL_URL = 'https://unpkg.com/@babel/standalone@7.29.2/babel.min.js';
const TAILWIND_URL = 'https://cdn.tailwindcss.com/3.4.17';
const HTML_TO_IMAGE_URL =
  'https://unpkg.com/html-to-image@1.11.13/dist/html-to-image.js';

// 'unsafe-eval' is required because Babel Standalone compiles JSX via Function()
// at runtime. That's safe here because the iframe has sandbox="allow-scripts"
// without allow-same-origin — the null origin isolates eval from the parent.
const CSP =
  "default-src 'none'; " +
  "script-src 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com; " +
  "style-src 'unsafe-inline' https://cdn.tailwindcss.com; " +
  'img-src data:; ' +
  'font-src data: https:; ' +
  "connect-src 'none';";

/**
 * Escapes a string for safe embedding inside a <script> element's text body.
 *
 * The browser HTML parser ends a <script> block as soon as it sees
 * `</script` (case-insensitive), regardless of the script's type. LLM-
 * controlled content containing that sequence would otherwise break out of
 * the data island. We also defensively escape `<!--`, which also has
 * special handling inside script bodies.
 *
 * U+2028/U+2029 do not need to be escaped here because this data island has
 * type="application/json" (non-executing) and the payload is read back via
 * `textContent`. The backslash-escaped forms produced below are processed
 * by the HTML tokenizer (which treats `<\/script` as plain text) — textContent
 * returns the original literal text minus the escape.
 */
function safeForScriptTag(input: string): string {
  return input.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}

/**
 * Builds the HTML srcdoc for the JSX sandbox iframe.
 *
 * The iframe runs with sandbox="allow-scripts" (no allow-same-origin), which
 * puts it in a null-origin so user code cannot touch parent cookies, the
 * auth token, or the parent DOM. CSP further blocks any network call outside
 * the CDNs that ship React, Babel, and Tailwind.
 *
 * The LLM-controlled JSX source is stored in a non-executing data island
 * (<script type="application/json">) rather than being inlined into the
 * executing <script type="text/babel"> block. This prevents `</script>`,
 * U+2028, and U+2029 from breaking out of the script tag.
 */
export function buildSandboxSrcdoc(jsxSource: string): string {
  const safeSource = safeForScriptTag(jsxSource);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${CSP}" />
<script src="${REACT_URL}" crossorigin="anonymous"></script>
<script src="${REACT_DOM_URL}" crossorigin="anonymous"></script>
<script src="${BABEL_URL}" crossorigin="anonymous"></script>
<script src="${HTML_TO_IMAGE_URL}" crossorigin="anonymous"></script>
<script src="${TAILWIND_URL}" crossorigin="anonymous"></script>
<style>
  html, body, #root { margin: 0; padding: 0; min-height: 100%; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  #__jsx-error {
    position: fixed;
    inset: 0;
    padding: 1rem;
    background: #fff5f5;
    color: #991b1b;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    white-space: pre-wrap;
    overflow: auto;
    display: none;
  }
</style>
</head>
<body>
<div id="root"></div>
<pre id="__jsx-error"></pre>
<script type="application/json" id="__jsx-source">${safeSource}</script>
<script>
(function() {
  const srcEl = document.getElementById('__jsx-source');
  const src = srcEl ? srcEl.textContent : '';
  function reportError(message) {
    const el = document.getElementById('__jsx-error');
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
    }
    parent.postMessage({ type: 'jsx-error', message: message }, '*');
  }
  window.addEventListener('error', function(e) {
    reportError(e.message + '\\n' + (e.error && e.error.stack ? e.error.stack : ''));
  });
  window.addEventListener('unhandledrejection', function(e) {
    reportError('Unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason)));
  });
  try {
    const compiled = Babel.transform(src, { presets: ['react'] }).code;
    const wrapper = new Function('React', 'ReactDOM', compiled + '\\nif (typeof App !== "function") { throw new Error("Your JSX must define a function named App."); } return App;');
    const App = wrapper(React, ReactDOM);
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
    parent.postMessage({ type: 'jsx-ready' }, '*');
  } catch (err) {
    reportError(err.message + (err.stack ? '\\n' + err.stack : ''));
  }
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'export-png') {
      if (typeof htmlToImage === 'undefined' || !htmlToImage.toPng) {
        parent.postMessage({ type: 'export-png-result', error: 'html-to-image unavailable' }, '*');
        return;
      }
      htmlToImage.toPng(document.body, { cacheBust: true, pixelRatio: 2 })
        .then(function(dataUrl) {
          parent.postMessage({ type: 'export-png-result', dataUrl: dataUrl }, '*');
        })
        .catch(function(err) {
          parent.postMessage({ type: 'export-png-result', error: err.message || String(err) }, '*');
        });
    }
  });
})();
</script>
</body>
</html>`;
}

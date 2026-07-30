// Dev-server stub. In the built app the backend serves /config.js
// dynamically (its controller route registers before the static file
// handler, so this copy is never served there). An empty object makes
// runtimeEnv() fall back to Vite's build-time import.meta.env values.
window.__RUNTIME_CONFIG__ = {};

import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "./src/shared/api/openapi-schema.json",
    },
    output: {
      target: "./src/shared/api/generated",
      client: "react-query",
      httpClient: "axios",
      mode: "split",
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: "./src/shared/api/client.ts",
          name: "customAxiosInstance",
        },
      },
    },
  },
  // The Outlook pane cannot share the client above: it authenticates with a
  // bearer token and must send no cookies, and a same-origin XHR sends them
  // whatever `withCredentials` says. Fetch can omit them, so the pane gets its
  // own output over the same schema.
  pane: {
    input: {
      target: "./src/shared/api/openapi-schema.json",
    },
    output: {
      target: "./src/outlook/api/generated",
      client: "fetch",
      httpClient: "fetch",
      mode: "split",
      mock: false,
      clean: true,
      override: {
        mutator: {
          path: "./src/outlook/api/pane-fetch.ts",
          name: "paneFetch",
        },
      },
    },
  },
});

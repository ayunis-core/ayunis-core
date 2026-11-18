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
});

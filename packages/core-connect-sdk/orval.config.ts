import { defineConfig } from "orval";

export default defineConfig({
  core: {
    input: "../../contracts/core-connect.openapi.json",
    output: {
      target: "./src/client/generated.ts",
      client: "axios-functions",
      mode: "single",
      headers: true,
      formatter: "prettier",
      override: {
        mutator: { path: "./src/client/transport.ts", name: "coreRequest" },
      },
    },
  },
});

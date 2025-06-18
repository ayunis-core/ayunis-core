#!/usr/bin/env node

import fs from "fs";
import path from "path";

// Check if we're running from the correct directory
const currentDirName = path.basename(process.cwd());
if (currentDirName !== "ayunis-core-frontend") {
  console.error(
    "❌ Error: This script must be executed from the core-frontend directory",
  );
  console.error(`   Current directory: ${currentDirName}`);
  console.error("   Expected directory: core-frontend");
  console.error(
    "   Please navigate to the core-frontend directory and run the script again.",
  );
  process.exit(1);
}

const BASE_URL = process.env.VITE_API_BASE_URL;
const API_ENDPOINT = "/docs-json";
const API_URL = `${BASE_URL}${API_ENDPOINT}`;
const OUTPUT_PATH = path.join(
  process.cwd(),
  "src",
  "shared",
  "api",
  "openapi-schema.json",
);

async function fetchOpenApiSchema() {
  try {
    console.log("Fetching OpenAPI schema from:", API_URL);
    console.log("  Base URL:", BASE_URL);
    console.log("  Endpoint:", API_ENDPOINT);

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const schema = await response.json();

    // Ensure the output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the schema to file with pretty formatting
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(schema, null, 2));

    console.log("✅ OpenAPI schema successfully saved to:", OUTPUT_PATH);
    console.log(
      "📄 Schema contains",
      Object.keys(schema).length,
      "top-level properties",
    );

    if (schema.info) {
      console.log("📋 API Info:");
      console.log("   Title:", schema.info.title || "N/A");
      console.log("   Version:", schema.info.version || "N/A");
    }
  } catch (error) {
    console.error("❌ Error fetching OpenAPI schema:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.error(`💡 Make sure your server is running on ${BASE_URL}`);
    }

    process.exit(1);
  }
}

// Display configuration info
console.log("🔧 Configuration:");
console.log("   API_BASE_URL:", BASE_URL);
console.log("   API_ENDPOINT:", API_ENDPOINT);
console.log("");

fetchOpenApiSchema();

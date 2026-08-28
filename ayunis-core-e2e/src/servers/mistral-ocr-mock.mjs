import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import process from "node:process";

const port = Number(process.env.E2E_MISTRAL_OCR_PORT ?? 3199);
const fileId = "e2e-screenshot-pdf";

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }

  if (request.method === "POST" && request.url === "/v1/files") {
    await readBody(request);
    return sendJson(response, 200, {
      id: fileId,
      object: "file",
      bytes: 1024,
      created_at: 0,
      filename: "screenshot-record.pdf",
      purpose: "ocr",
      sample_type: "instruct",
      source: "upload",
    });
  }

  if (request.method === "POST" && request.url === "/v1/ocr") {
    const body = JSON.parse(await readBody(request));
    if (!requestsImageTextAnnotations(body)) {
      return sendJson(response, 400, {
        message: "Expected image text annotations without base64 image data",
      });
    }
    return sendJson(response, 200, ocrResponse());
  }

  if (request.method === "DELETE" && request.url === `/v1/files/${fileId}`) {
    sendJson(response, 200, {
      id: fileId,
      object: "file",
      deleted: true,
    });
    if (process.env.E2E_MISTRAL_OCR_EXIT_AFTER_DELETE === "true") {
      server.close();
    }
    return;
  }

  return sendJson(response, 404, { message: "Not found" });
});

server.listen(port, "127.0.0.1");

function requestsImageTextAnnotations(body) {
  return (
    body?.include_image_base64 === false &&
    body?.bbox_annotation_format?.type === "json_schema" &&
    body?.bbox_annotation_format?.json_schema?.name === "image_text"
  );
}

function ocrResponse() {
  return {
    pages: [
      {
        index: 0,
        markdown: "![img-0.jpeg](img-0.jpeg)",
        images: [
          {
            id: "img-0.jpeg",
            top_left_x: 50,
            top_left_y: 225,
            bottom_right_x: 266,
            bottom_right_y: 357,
            image_annotation: JSON.stringify({
              text: "Case AYC-815-2026: Extraction approved by council",
            }),
          },
        ],
        dimensions: null,
      },
    ],
    model: "mistral-ocr-latest",
    usage_info: { pages_processed: 1, doc_size_bytes: 1024 },
  };
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

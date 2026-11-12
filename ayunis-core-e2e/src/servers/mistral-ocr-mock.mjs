import { Buffer } from "node:buffer";
import { createServer } from "node:http";
import process from "node:process";

const port = Number(process.env.E2E_MISTRAL_OCR_PORT ?? 3199);

const extractionCounts = new Map();
const speech = { requests: [], hold: false, releases: [] };
// Recordings whose file name carries this marker are answered only once a
// test releases them, so it can act while the transcription is running.
const HELD_TRANSCRIPTION_MARKER = "transcription-hold";
const transcriptions = { requests: [], held: new Map() };

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    return sendJson(response, 200, { status: "ok" });
  }

  if (request.method === "GET" && request.url.startsWith("/extractions/")) {
    const marker = request.url.slice("/extractions/".length);
    return sendJson(response, 200, {
      count: extractionCounts.get(marker) ?? 0,
    });
  }

  if (request.url.startsWith("/speech/")) {
    return handleSpeechControl(request, response);
  }

  if (request.url.startsWith("/transcription/")) {
    return handleTranscriptionControl(request, response);
  }

  if (request.method === "POST" && request.url === "/v1/audio/transcriptions") {
    return transcribe(request, response);
  }

  if (request.method === "POST" && request.url === "/v1/audio/speech") {
    return streamSpeech(JSON.parse(await readBody(request)), response);
  }

  if (request.method === "POST" && request.url === "/v1/ocr") {
    const body = JSON.parse(await readBody(request));
    if (body.document?.type !== "document_url") {
      return sendJson(response, 400, {
        message: "Expected the document inline as a document_url",
      });
    }
    const document = decodeDocument(body.document.document_url);
    if (document.includes("AYC-1059-OCR-REJECT")) {
      return sendJson(response, 400, {
        object: "error",
        type: "document_parser_invalid_file",
        message: "Synthetic OCR rejection",
        code: "3740",
      });
    }
    const marker = document.match(/AYC-1348-[a-f0-9-]+/)?.[0];
    if (marker)
      extractionCounts.set(marker, (extractionCounts.get(marker) ?? 0) + 1);
    if (!requestsImageTextAnnotations(body)) {
      return sendJson(response, 400, {
        message: "Expected image text annotations without base64 image data",
      });
    }
    return sendJson(response, 200, ocrResponse());
  }

  return sendJson(response, 404, { message: "Not found" });
});

server.listen(port, "127.0.0.1");

function decodeDocument(documentUrl) {
  const base64 = String(documentUrl ?? "").split(";base64,")[1] ?? "";
  return Buffer.from(base64, "base64").toString("latin1");
}

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

// Test controls for the read-aloud journey: inspect the received requests,
// and hold a stream open after its first audio so a test can observe
// playback that started before the audio was complete.
function handleSpeechControl(request, response) {
  if (request.method === "GET" && request.url === "/speech/requests") {
    return sendJson(response, 200, speech.requests);
  }
  if (request.method === "POST" && request.url === "/speech/reset") {
    speech.requests = [];
    speech.hold = false;
    releaseHeldSpeech();
    return sendJson(response, 200, {});
  }
  if (request.method === "POST" && request.url === "/speech/hold") {
    speech.hold = true;
    return sendJson(response, 200, {});
  }
  if (request.method === "POST" && request.url === "/speech/release") {
    speech.hold = false;
    releaseHeldSpeech();
    return sendJson(response, 200, {});
  }
  return sendJson(response, 404, { message: "Not found" });
}

function releaseHeldSpeech() {
  for (const release of speech.releases.splice(0)) release();
}

async function streamSpeech(body, response) {
  if (body.stream !== true || body.response_format !== "mp3") {
    return sendJson(response, 400, {
      message: "Expected a streamed MP3 speech request",
    });
  }
  speech.requests.push({
    input: body.input,
    voiceId: body.voice_id,
    model: body.model,
  });
  response.writeHead(200, { "content-type": "text/event-stream" });
  // About two seconds of audio, so playback is still running when a test
  // checks on it.
  const frames = silentMp3Frames(80);
  const half = frames.length / 2;
  sendAudioDelta(response, Buffer.concat(frames.slice(0, half)));
  if (speech.hold) {
    await new Promise((resolve) => speech.releases.push(resolve));
  }
  if (response.destroyed) return;
  sendAudioDelta(response, Buffer.concat(frames.slice(half)));
  response.write(
    `event: speech.audio.done\ndata: ${JSON.stringify({
      type: "speech.audio.done",
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    })}\n\n`,
  );
  response.end();
}

function sendAudioDelta(response, audio) {
  response.write(
    `event: speech.audio.delta\ndata: ${JSON.stringify({
      type: "speech.audio.delta",
      audio_data: audio.toString("base64"),
    })}\n\n`,
  );
}

// Silent MPEG-1 Layer III frames (128 kbit/s, 44.1 kHz, mono): a valid header
// with empty side information decodes to 26 ms of silence each.
function silentMp3Frames(count) {
  const frame = Buffer.alloc(417);
  frame.set([0xff, 0xfb, 0x90, 0xc0]);
  return Array.from({ length: count }, () => frame);
}

// A short council meeting with two speakers, as Voxtral returns it with
// diarization and segment timestamps.
async function transcribe(request, response) {
  const body = (await readRawBody(request)).toString("latin1");
  const fileName = body.match(/filename="([^"]*)"/)?.[1] ?? "";
  transcriptions.requests.push({
    fileName,
    diarize: /name="diarize"\r\n\r\ntrue/.test(body),
  });
  if (fileName.includes(HELD_TRANSCRIPTION_MARKER)) {
    await new Promise((resolve) => {
      transcriptions.held.set(fileName, resolve);
      request.on("close", resolve);
    });
    transcriptions.held.delete(fileName);
    if (response.destroyed) return;
  }
  const segments = [
    ["speaker_0", 0.2, 1.4, "Willkommen zur Sitzung des Gemeinderats."],
    ["speaker_1", 1.6, 2.8, "Danke, wir beginnen mit dem Haushalt."],
    ["speaker_0", 3.0, 3.9, "Der Haushalt ist beschlossen."],
  ].map(([speakerId, start, end, text]) => ({
    type: "transcription_segment",
    text,
    start,
    end,
    speaker_id: speakerId,
  }));
  return sendJson(response, 200, {
    text: segments.map((segment) => segment.text).join(" "),
    language: "de",
    model: "voxtral-mini-2602",
    usage: {
      prompt_audio_seconds: 4,
      prompt_tokens: 0,
      total_tokens: 0,
      completion_tokens: 0,
      request_count: 1,
    },
    segments,
  });
}

async function handleTranscriptionControl(request, response) {
  if (request.method === "GET" && request.url === "/transcription/requests") {
    return sendJson(response, 200, transcriptions.requests);
  }
  if (request.method === "GET" && request.url === "/transcription/held") {
    return sendJson(response, 200, [...transcriptions.held.keys()]);
  }
  if (request.method === "POST" && request.url === "/transcription/release") {
    const { fileName } = JSON.parse(await readBody(request));
    transcriptions.held.get(fileName)?.();
    return sendJson(response, 200, {});
  }
  return sendJson(response, 404, { message: "Not found" });
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  return (await readRawBody(request)).toString("utf8");
}

async function readRawBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks);
}

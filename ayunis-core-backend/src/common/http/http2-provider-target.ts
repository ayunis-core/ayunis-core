import type { IncomingHttpHeaders } from 'node:http2';
import type { ConfigService } from '@nestjs/config';

const DEFAULT_HOSTS = new Map([
  ['api.mistral.ai', 'mistral'],
  ['api.eu.mistral.ai', 'mistral'],
  ['api.anthropic.com', 'anthropic'],
  ['api.openai.com', 'openai'],
  ['generativelanguage.googleapis.com', 'gemini'],
]);

const CONFIGURED_ENDPOINTS = [
  ['models.azure.endpoint', 'azure'],
  ['retrieval.mistral.serverUrl', 'mistral'],
  ['embeddings.mistral.serverUrl', 'mistral'],
  ['models.ollama.baseURL', 'ollama'],
  ['models.synaforce.baseURL', 'synaforce'],
  ['models.ayunis.baseURL', 'ayunis'],
  ['models.otc.baseURL', 'otc'],
  ['models.stackit.baseURL', 'stackit'],
  ['models.scaleway.baseURL', 'scaleway'],
] as const;

export interface Http2ProviderTarget {
  provider: string;
  upstreamHost: string;
  operation: string;
}

export class Http2ProviderTargets {
  private readonly hosts = new Map(DEFAULT_HOSTS);

  constructor(config: ConfigService) {
    for (const [key, provider] of CONFIGURED_ENDPOINTS) {
      const host = hostname(config.get<unknown>(key));
      if (host) {
        const existing = this.hosts.get(host);
        this.hosts.set(
          host,
          existing && existing !== provider ? 'shared' : provider,
        );
      }
    }
  }

  resolve(headers: IncomingHttpHeaders): Http2ProviderTarget | undefined {
    const authority = headers[':authority'];
    const host =
      typeof authority === 'string'
        ? hostname(`https://${authority}`)
        : undefined;
    if (!host) return undefined;
    const provider = this.hosts.get(host) ?? bedrockProvider(host);
    if (!provider) return undefined;
    return {
      provider,
      upstreamHost: host,
      operation: operationFor(headers[':path']),
    };
  }
}

function hostname(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    return url.hostname;
  } catch {
    return undefined;
  }
}

function bedrockProvider(host: string): string | undefined {
  return /^bedrock-runtime\.[a-z0-9-]+\.amazonaws\.com(?:\.cn)?$/.test(host)
    ? 'bedrock'
    : undefined;
}

function operationFor(value: unknown): string {
  if (typeof value !== 'string') return 'other';
  const path = value.split('?')[0];
  if (/\/audio\/transcriptions\/?$/.test(path)) return 'transcription';
  if (/\/ocr\/?$/.test(path)) return 'ocr';
  if (/\/embeddings\/?$|:(?:embedContent|batchEmbedContents)$/.test(path)) {
    return 'embedding';
  }
  if (
    /\/(?:chat\/completions|responses|messages|invoke|invoke-with-response-stream)\/?$|:(?:streamGenerateContent|generateContent)$/.test(
      path,
    )
  ) {
    return 'inference';
  }
  return 'other';
}

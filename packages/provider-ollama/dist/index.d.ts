import { ModelProvider } from '@ayunis/inference';

interface OllamaProviderOptions {
    /** Ollama host, e.g. 'http://localhost:11434'. */
    baseUrl: string;
    /** Ollama model id, e.g. 'llama3.1'. */
    model: string;
    /** Extra request headers, e.g. Bearer auth for the Ayunis-hosted variant. */
    headers?: Record<string, string>;
    /** Initial-request retry budget for transient failures. Default: 0. */
    maxRetries?: number;
    /** Context window. Default 30000. */
    numCtx?: number;
}
/**
 * The shipped Ollama ModelProvider. The host supplies selection, host URL and
 * credentials; everything else (wire format, streaming, chunk parsing) lives
 * here. Native `thinking` is mapped to thinking deltas; inline `<think>` tags
 * are left in the text for host-side splitting.
 */
declare const ollama: (options: OllamaProviderOptions) => ModelProvider;

export { type OllamaProviderOptions, ollama };

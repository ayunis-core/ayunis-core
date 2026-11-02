import { randomUUID } from 'node:crypto';
import { channel } from 'node:diagnostics_channel';
import type {
  Http2Session,
  ClientHttp2Stream,
  IncomingHttpHeaders,
} from 'node:http2';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isSpanContextValid, trace } from '@opentelemetry/api';
import {
  Http2ProviderTargets,
  type Http2ProviderTarget,
} from './http2-provider-target';
import {
  http2GoawayReason,
  http2ErrorCode,
  http2Number,
  http2ResetName,
  http2RuntimeVersions,
} from './http2-diagnostic-facts';

interface StreamEvent {
  stream?: ClientHttp2Stream;
  headers?: IncomingHttpHeaders;
  error?: unknown;
}

interface SessionState {
  session: Http2Session;
  id: string;
  startedAt: number;
  streamCount: number;
  activeStreams: number;
  peerMaxConcurrentStreams?: number;
  goawayCode?: number;
  goawayLastStreamId?: number;
  goawayDebugBytes?: number;
  goawayReason?: string;
  cleanup: () => void;
}

interface StreamState extends Http2ProviderTarget {
  session: SessionState;
  startedAt: number;
  headersReceived: boolean;
  closeObserved: boolean;
  upstreamStatus?: number;
  errorCode?: string;
  trace_id?: string;
  span_id?: string;
}

@Injectable()
export class Http2TransportDiagnostics
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(Http2TransportDiagnostics.name);
  private readonly runtime = http2RuntimeVersions();
  private streams = new WeakMap<ClientHttp2Stream, StreamState>();
  private sessions = new WeakMap<Http2Session, SessionState>();
  private readonly activeSessions = new Set<SessionState>();
  private targets: Http2ProviderTargets;
  private readonly subscriptions = new Map<
    string,
    (message: unknown) => void
  >();

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (this.subscriptions.size > 0) return;
    this.targets = new Http2ProviderTargets(this.config);
    this.subscribe('created', (event) => this.created(event));
    this.subscribe('finish', (event) => this.headersReceived(event));
    this.subscribe('error', (event) => this.failed(event));
    this.subscribe('close', (event) => this.closed(event));
    this.logger.log(this.runtime, 'Provider HTTP2 diagnostics initialized');
  }

  onModuleDestroy(): void {
    for (const [name, handler] of this.subscriptions)
      channel(name).unsubscribe(handler);
    this.subscriptions.clear();
    for (const session of this.activeSessions) session.cleanup();
    this.streams = new WeakMap();
    this.sessions = new WeakMap();
  }

  private subscribe(
    event: string,
    handler: (event: StreamEvent) => void,
  ): void {
    const name = `http2.client.stream.${event}`;
    const subscriber = (message: unknown) => {
      try {
        handler(message as StreamEvent);
      } catch {
        // Diagnostic subscribers run inside Node's transport and must not throw.
      }
    };
    this.subscriptions.set(name, subscriber);
    channel(name).subscribe(subscriber);
  }

  private created({ stream, headers }: StreamEvent): void {
    if (!stream?.session || !headers) return;
    const target = this.targets.resolve(headers);
    if (!target) return;
    const session = this.sessionState(stream.session);
    session.streamCount++;
    session.activeStreams++;
    session.peerMaxConcurrentStreams = http2Number(
      stream.session.remoteSettings.maxConcurrentStreams,
    );
    const span = trace.getActiveSpan()?.spanContext();
    this.streams.set(stream, {
      ...target,
      session,
      startedAt: performance.now(),
      headersReceived: false,
      closeObserved: false,
      ...(span && isSpanContextValid(span)
        ? { trace_id: span.traceId, span_id: span.spanId }
        : {}),
    });
  }

  private headersReceived({ stream, headers }: StreamEvent): void {
    const state = stream && this.streams.get(stream);
    if (!state) return;
    state.headersReceived = true;
    state.upstreamStatus = http2Number(headers?.[':status']);
  }

  private failed({ stream, error }: StreamEvent): void {
    const state = stream && this.streams.get(stream);
    if (state) state.errorCode = http2ErrorCode(error);
  }

  private closed({ stream }: StreamEvent): void {
    if (!stream) return;
    const state = this.streams.get(stream);
    if (!state || state.closeObserved) return;
    state.closeObserved = true;
    const activeStreams = state.session.activeStreams--;
    // Node publishes close before _destroy constructs and publishes its error.
    queueMicrotask(() => {
      try {
        this.emitFailure(stream, state, activeStreams);
      } catch {
        // Deferred diagnostics must not turn a logger failure into a crash.
      } finally {
        this.streams.delete(stream);
      }
    });
  }

  private emitFailure(
    stream: ClientHttp2Stream,
    state: StreamState,
    activeStreams: number,
  ): void {
    if (this.subscriptions.size === 0) return;
    const resetCode = http2Number(stream.rstCode);
    const hasReset =
      resetCode !== undefined && resetCode !== 0 && resetCode !== 8;
    const hasError =
      state.errorCode && state.errorCode !== 'ERR_HTTP2_STREAM_CANCEL';
    if (!hasReset && !hasError) return;
    this.logger.warn(
      {
        ...this.streamFacts(stream, state),
        ...this.sessionFacts(state.session),
        ...this.runtime,
        activeStreams,
        resetCode,
        resetName: http2ResetName(resetCode),
      },
      'Provider HTTP2 stream failed',
    );
  }

  private streamFacts(stream: ClientHttp2Stream, state: StreamState) {
    return {
      provider: state.provider,
      upstreamHost: state.upstreamHost,
      operation: state.operation,
      trace_id: state.trace_id,
      span_id: state.span_id,
      streamId: http2Number(stream.id),
      elapsedMs: Math.round(performance.now() - state.startedAt),
      phase: state.headersReceived
        ? 'response_body'
        : 'before_response_headers',
      responseBodyRead: stream.readableDidRead === true,
      upstreamStatus: state.upstreamStatus,
      transportErrorCode: state.errorCode,
    };
  }

  private sessionFacts(state: SessionState) {
    return {
      protocol: 'h2',
      sessionId: state.id,
      sessionObservedMs: Math.round(performance.now() - state.startedAt),
      sessionStreamCount: state.streamCount,
      peerMaxConcurrentStreams: state.peerMaxConcurrentStreams,
      goawayCode: state.goawayCode,
      goawayLastStreamId: state.goawayLastStreamId,
      goawayDebugBytes: state.goawayDebugBytes,
      goawayReason: state.goawayReason,
    };
  }

  private sessionState(session: Http2Session): SessionState {
    const existing = this.sessions.get(session);
    if (existing) return existing;
    const state: SessionState = {
      session,
      id: randomUUID(),
      startedAt: performance.now(),
      streamCount: 0,
      activeStreams: 0,
      cleanup: () => {
        session.off('goaway', onGoaway);
        session.off('remoteSettings', onSettings);
        session.off('close', state.cleanup);
        this.activeSessions.delete(state);
      },
    };
    const onGoaway = (code: number, lastStreamId: number, data: Buffer) => {
      state.goawayCode = http2Number(code);
      state.goawayLastStreamId = http2Number(lastStreamId);
      state.goawayReason = http2GoawayReason(data);
      state.goawayDebugBytes = Buffer.isBuffer(data) ? data.length : undefined;
    };
    const onSettings = (
      settings: { maxConcurrentStreams?: number } | null | undefined,
    ) => {
      state.peerMaxConcurrentStreams = http2Number(
        settings?.maxConcurrentStreams,
      );
    };
    session.on('remoteSettings', onSettings);
    session.on('goaway', onGoaway);
    session.once('close', state.cleanup);
    this.sessions.set(session, state);
    this.activeSessions.add(state);
    return state;
  }
}

import { Logger } from '@nestjs/common';
import { Appsignal, sendError } from '@appsignal/nodejs';

const APPSIGNAL_STOP_TIMEOUT_MS = 2_000;
const FAILURE_EXIT_CODE = 1;

function normalizeError(reason: unknown): Error {
  return reason instanceof Error
    ? reason
    : new Error(stringifyRejectionReason(reason));
}

// Preserves structured rejection reasons in logs instead of reducing objects
// to "[object Object]".
function stringifyRejectionReason(reason: unknown): string {
  if (typeof reason === 'string') {
    return reason;
  }

  try {
    const serialized = JSON.stringify(reason) as string | undefined;
    return serialized ?? String(reason);
  } catch {
    return String(reason);
  }
}

export class ProcessCrashHandlers {
  private readonly logger = new Logger(ProcessCrashHandlers.name);

  private fatalShutdownStarted = false;

  register(): void {
    process.on('unhandledRejection', this.handleUnhandledRejection);
    process.on('uncaughtException', this.handleUncaughtException);
  }

  readonly handleUnhandledRejection = (reason: unknown): void => {
    const error = normalizeError(reason);

    this.reportError('Unhandled promise rejection', error);
  };

  // unknown, not Error: Node delivers whatever was thrown, including
  // null, strings, and plain objects.
  readonly handleUncaughtException = (thrown: unknown): void => {
    if (this.fatalShutdownStarted) {
      return;
    }

    this.fatalShutdownStarted = true;

    try {
      // An uncaught synchronous exception may leave the process in an
      // inconsistent state. Report it, flush telemetry, and terminate.
      this.reportError('Uncaught exception', normalizeError(thrown));
      void this.stopAppsignalAndExit();
    } catch {
      this.exitProcess();
    }
  };

  private reportError(message: string, error: Error): void {
    try {
      this.logger.error(`${message}: ${error.message}`, error.stack);
    } catch {
      // There is no safer logging channel left.
    }

    try {
      // sendError, not setError: crash handlers run outside any request, so
      // there is no active span to attach the error to.
      sendError(error);
    } catch {
      // AppSignal being unavailable must not take the handler with it.
    }
  }

  private async stopAppsignalAndExit(): Promise<never> {
    try {
      // stop() flushes pending data to the agent but has no timeout of its
      // own; cap it so a wedged agent cannot stall the crash exit.
      await Promise.race([
        Appsignal.client.stop(ProcessCrashHandlers.name),
        new Promise((resolve) =>
          setTimeout(resolve, APPSIGNAL_STOP_TIMEOUT_MS).unref(),
        ),
      ]);
    } catch (reason: unknown) {
      const error = normalizeError(reason);

      this.logger.error(
        `Failed to stop AppSignal before shutdown: ${error.message}`,
        error.stack,
      );
    } finally {
      this.exitProcess();
    }
  }

  private exitProcess(): never {
    process.exit(FAILURE_EXIT_CODE);
  }
}

/*
 * Self-registers at import time: main.ts imports this module before the
 * AppModule import evaluates the whole application graph, so coverage exists
 * while modules are still loading. AppSignal (v3) installs no process
 * handlers of its own, so this module alone owns the crash path (log,
 * report, exit policy). Skipped under test — the spec constructs its own
 * instances and must not attach global listeners to the Jest worker process.
 */
if (process.env.NODE_ENV !== 'test') {
  new ProcessCrashHandlers().register();
}

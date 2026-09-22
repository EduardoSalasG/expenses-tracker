export const DEFAULT_INBOUND_EVENT_BATCH_SIZE = 25;
export const DEFAULT_INBOUND_EVENT_POLL_INTERVAL_MS = 1000;
const MINIMUM_INBOUND_EVENT_POLL_INTERVAL_MS = 250;

export type InboundEventWorkerSettings = {
  limit: number;
  pollIntervalMs: number;
};

export type InboundEventWorkerOptions = InboundEventWorkerSettings & {
  processPending: (limit: number) => Promise<number>;
  close: () => Promise<void>;
  signal: AbortSignal;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
};

export function parseInboundWorkerSettings(env: NodeJS.ProcessEnv): InboundEventWorkerSettings {
  return {
    limit: parsePositiveInteger(env.INBOUND_EVENT_BATCH_SIZE, DEFAULT_INBOUND_EVENT_BATCH_SIZE),
    pollIntervalMs: Math.max(
      MINIMUM_INBOUND_EVENT_POLL_INTERVAL_MS,
      parsePositiveInteger(env.INBOUND_EVENT_POLL_INTERVAL_MS, DEFAULT_INBOUND_EVENT_POLL_INTERVAL_MS)
    )
  };
}

export async function runInboundEventWorker(options: InboundEventWorkerOptions): Promise<void> {
  const wait = options.wait ?? waitForAbort;
  try {
    while (!options.signal.aborted) {
      const processed = await options.processPending(options.limit);
      if (processed === 0 && !options.signal.aborted) {
        await wait(options.pollIntervalMs, options.signal);
      }
    }
  } finally {
    await options.close();
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function waitForAbort(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(finish, milliseconds);

    function finish() {
      clearTimeout(timeout);
      signal.removeEventListener('abort', finish);
      resolve();
    }

    signal.addEventListener('abort', finish, { once: true });
  });
}

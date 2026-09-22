import { describe, expect, it, vi } from 'vitest';
import { parseInboundWorkerSettings, runInboundEventWorker, waitForAbort } from './inbound-event-worker.js';

describe('inbound event worker', () => {
  it('drains consecutive batches before waiting and closes after abort', async () => {
    const controller = new AbortController();
    const processPending = vi.fn().mockResolvedValueOnce(25).mockResolvedValueOnce(0);
    const wait = vi.fn(async () => controller.abort());
    const close = vi.fn().mockResolvedValue(undefined);

    await runInboundEventWorker({
      processPending,
      close,
      limit: 25,
      pollIntervalMs: 1000,
      signal: controller.signal,
      wait
    });

    expect(processPending).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(1000, controller.signal);
    expect(close).toHaveBeenCalledOnce();
  });

  it('uses safe defaults when worker environment values are invalid', () => {
    expect(parseInboundWorkerSettings({
      INBOUND_EVENT_BATCH_SIZE: '0',
      INBOUND_EVENT_POLL_INTERVAL_MS: '-1'
    })).toEqual({ limit: 25, pollIntervalMs: 1000 });
  });

  it('does not wait after shutdown was already requested', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(waitForAbort(60_000, controller.signal)).resolves.toBeUndefined();
  });
});

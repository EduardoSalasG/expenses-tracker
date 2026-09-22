import { describe, expect, it, vi } from 'vitest';
import { startInboundEventWorkerDaemon } from './inbound-event-worker-daemon.js';

describe('inbound event worker daemon', () => {
  it('stops after SIGTERM and logs only operational metadata', async () => {
    let onTerm: (() => void) | undefined;
    const processPending = vi.fn().mockResolvedValue(0);
    const close = vi.fn().mockResolvedValue(undefined);
    const info = vi.fn();
    const wait = vi.fn(async () => onTerm?.());

    await startInboundEventWorkerDaemon({
      container: { close, logger: { info } },
      service: { processPending },
      process: {
        once: vi.fn((signal: string, callback: () => void) => {
          if (signal === 'SIGTERM') onTerm = callback;
        }),
        removeListener: vi.fn()
      },
      env: { INBOUND_EVENT_BATCH_SIZE: '4', INBOUND_EVENT_POLL_INTERVAL_MS: '1000' },
      wait
    });

    expect(processPending).toHaveBeenCalledWith(4);
    expect(close).toHaveBeenCalledOnce();
    expect(info).toHaveBeenCalledWith('Inbound event worker started.', { limit: 4, pollIntervalMs: 1000 });
    expect(info).toHaveBeenCalledWith('Inbound event worker stopped.');
  });

  it('preserves the inbound service receiver while processing', async () => {
    let onTerm: (() => void) | undefined;
    const close = vi.fn().mockResolvedValue(undefined);
    const service = {
      calls: 0,
      async processPending() {
        this.calls += 1;
        return 0;
      }
    };

    await startInboundEventWorkerDaemon({
      container: { close, logger: { info: vi.fn() } },
      service,
      process: {
        once: vi.fn((signal: string, callback: () => void) => {
          if (signal === 'SIGTERM') onTerm = callback;
        }),
        removeListener: vi.fn()
      },
      wait: vi.fn(async () => onTerm?.())
    });

    expect(service.calls).toBe(1);
  });
});

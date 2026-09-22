import { parseInboundWorkerSettings, runInboundEventWorker } from './inbound-event-worker.js';

type WorkerContainer = {
  close: () => Promise<void>;
  logger: {
    info: (message: string, metadata?: Record<string, unknown>) => void;
  };
};

type WorkerService = {
  processPending: (limit: number) => Promise<number>;
};

type SignalProcess = {
  once: (signal: 'SIGTERM' | 'SIGINT', listener: () => void) => unknown;
  removeListener: (signal: 'SIGTERM' | 'SIGINT', listener: () => void) => unknown;
};

export type InboundEventWorkerDaemonOptions = {
  container: WorkerContainer;
  service: WorkerService;
  process?: SignalProcess;
  env?: NodeJS.ProcessEnv;
  wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
};

export async function startInboundEventWorkerDaemon(options: InboundEventWorkerDaemonOptions): Promise<void> {
  const settings = parseInboundWorkerSettings(options.env ?? process.env);
  const controller = new AbortController();
  const runtimeProcess = options.process ?? process;
  const stop = () => controller.abort();

  runtimeProcess.once('SIGTERM', stop);
  runtimeProcess.once('SIGINT', stop);
  options.container.logger.info('Inbound event worker started.', settings);

  try {
    await runInboundEventWorker({
      ...settings,
      processPending: options.service.processPending,
      close: options.container.close,
      signal: controller.signal,
      wait: options.wait
    });
  } finally {
    runtimeProcess.removeListener('SIGTERM', stop);
    runtimeProcess.removeListener('SIGINT', stop);
    options.container.logger.info('Inbound event worker stopped.');
  }
}

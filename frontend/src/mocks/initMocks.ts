let workerPromise: Promise<void> | null = null;

export async function initMocks() {
  if (
    typeof window === 'undefined' ||
    process.env.NODE_ENV !== 'development' ||
    process.env.NEXT_PUBLIC_API_MOCKING !== 'enabled'
  ) {
    return;
  }

  if (!workerPromise) {
    const [{ worker }, { EventSourcePolyfill }] = await Promise.all([
      import('./browser'),
      import('event-source-polyfill'),
    ]);

    window.EventSource = EventSourcePolyfill as any;

    workerPromise = worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
  }

  return workerPromise;
}

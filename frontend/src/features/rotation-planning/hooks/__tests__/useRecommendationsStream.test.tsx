import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecommendationsStream } from '../useRecommendationsStream';

const applyResultMock = vi.fn();
const setKafkaStatusMock = vi.fn();

vi.mock('../../store/recommendationsJobs', () => ({
  useRecommendationsJobs: (selector: any) =>
    selector({
      applyResult: applyResultMock,
      setKafkaStatus: setKafkaStatusMock,
    }),
}));

class MockEventSource {
  static instances: MockEventSource[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;
  readyState = MockEventSource.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    MockEventSource.instances.push(this);
  }

  triggerOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.(new Event('open'));
  }

  emitMessage(data: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }

  emitError() {
    this.onerror?.(new Event('error'));
  }

  close() {
    this.readyState = MockEventSource.CLOSED;
  }

}

describe('useRecommendationsStream', () => {
  const originalEventSource = global.EventSource;

  beforeEach(() => {
    MockEventSource.instances = [];
    (global as any).EventSource = MockEventSource as any;
    applyResultMock.mockClear();
    setKafkaStatusMock.mockClear();
  });

  afterEach(() => {
    (global as any).EventSource = originalEventSource;
  });

  it('connects to SSE and dispatches parsed messages', async () => {
    const onMessage = vi.fn();
    const onError = vi.fn();

    renderHook(() =>
      useRecommendationsStream({
        fieldId: 'field-11',
        traceId: 'trace-123',
        onMessage,
        onError,
      })
    );

    const source = MockEventSource.instances.at(-1)!;
    expect(source.url).toContain('field_id=field-11');
    expect(source.url).toContain('trace_id=trace-123');

    act(() => {
      source.triggerOpen();
    });

    await waitFor(() => {
      expect(setKafkaStatusMock).toHaveBeenCalledWith(true);
    });

    const message = {
      event_id: '123e4567-e89b-12d3-a456-426614174000',
      request_id: 'req-42',
      field_id: 'field-11',
      target_season: 'spring',
      target_year: 2025,
      processed_at: new Date().toISOString(),
      status: 'success',
    };

    act(() => {
      source.emitMessage(message);
    });

    expect(applyResultMock).toHaveBeenCalledWith(message);
    expect(onMessage).toHaveBeenCalledWith(message);
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports connection errors and toggles Kafka status', async () => {
    const onError = vi.fn();

    renderHook(() => useRecommendationsStream({ onError }));
    const source = MockEventSource.instances.at(-1)!;

    act(() => {
      source.readyState = MockEventSource.CLOSED;
      source.emitError();
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
    expect(setKafkaStatusMock).toHaveBeenCalledWith(
      false,
      'Соединение с сервером событий потеряно'
    );
  });
});

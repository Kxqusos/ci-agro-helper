import { useEffect, useRef, useCallback } from 'react';
import { RecommendationResultMessageSchema } from '../schemas/eventSchemas';
import type { RecommendationResultMessage } from '../schemas/eventSchemas';
import { useRecommendationsJobs } from '../store/recommendationsJobs';

/**
 * SSE client hook for recommendations event stream
 * Subscribes to Server-Sent Events for recommendation results
 */

interface UseRecommendationsStreamOptions {
  fieldId?: string;
  traceId?: string;
  enabled?: boolean;
  onMessage?: (message: RecommendationResultMessage) => void;
  onError?: (error: Error) => void;
}

export const useRecommendationsStream = ({
  fieldId,
  traceId,
  enabled = true,
  onMessage,
  onError,
}: UseRecommendationsStreamOptions = {}) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const applyResult = useRecommendationsJobs((state) => state.applyResult);
  const setKafkaStatus = useRecommendationsJobs((state) => state.setKafkaStatus);

  const connect = useCallback(() => {
    // Don't connect if disabled or already connected
    if (!enabled || eventSourceRef.current) {
      return;
    }

    // Build URL with query parameters
    const params = new URLSearchParams();
    if (fieldId) params.append('field_id', fieldId);
    if (traceId) params.append('trace_id', traceId);

    const url = `/api/events/recommendations?${params.toString()}`;

    console.log('[SSE] Connecting to:', url);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connection established');
        setKafkaStatus(true);
      };

      eventSource.onmessage = (event) => {
        console.log('[SSE] Message received:', event.data);

        try {
          // Parse JSON data
          const data = JSON.parse(event.data);

          // Validate with Zod schema
          const result = RecommendationResultMessageSchema.safeParse(data);

          if (!result.success) {
            console.error('[SSE] Validation failed:', result.error);
            const validationError = new Error(
              `Invalid message format: ${result.error.message}`
            );
            onError?.(validationError);
            return;
          }

          const message = result.data;
          console.log('[SSE] Valid message:', message);

          // Apply result to store
          applyResult(message);

          // Call custom handler if provided
          onMessage?.(message);
        } catch (err) {
          console.error('[SSE] Error parsing message:', err);
          onError?.(err as Error);
        }
      };

      eventSource.onerror = (event) => {
        console.error('[SSE] Connection error:', event);

        // Check if it's a network error
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[SSE] Connection closed, will retry...');
          setKafkaStatus(false, 'Соединение с сервером событий потеряно');
        }

        const error = new Error('SSE connection error');
        onError?.(error);

        // EventSource will automatically reconnect
      };
    } catch (err) {
      console.error('[SSE] Error creating EventSource:', err);
      onError?.(err as Error);
    }
  }, [enabled, fieldId, traceId, applyResult, setKafkaStatus, onMessage, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      console.log('[SSE] Disconnecting...');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  // Connect/disconnect on mount/unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Reconnect when parameters change
  useEffect(() => {
    if (enabled && eventSourceRef.current) {
      disconnect();
      // Small delay before reconnecting
      const timer = setTimeout(() => {
        connect();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [fieldId, traceId, enabled, connect, disconnect]);

  return {
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    disconnect,
    reconnect: () => {
      disconnect();
      connect();
    },
  };
};

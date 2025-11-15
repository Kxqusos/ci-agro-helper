'use client';

import { useEffect } from 'react';
import { initMocks } from '@/mocks/initMocks';

/**
 * Client-side component that conditionally starts the MSW worker.
 * The worker is loaded only in development when NEXT_PUBLIC_API_MOCKING=enabled.
 */
export const MockServiceWorkerProvider = () => {
  useEffect(() => {
    initMocks();
  }, []);

  return null;
};

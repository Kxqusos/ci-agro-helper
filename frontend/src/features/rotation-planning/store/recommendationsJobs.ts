import { create } from 'zustand';
import type { RecommendationResultMessage } from '../schemas/eventSchemas';
import type { RecommendationQueryResponse } from '../services/recommendationsApi';

/**
 * Zustand store for managing recommendation jobs/tasks
 * Tracks asynchronous recommendation requests and their results
 */

export type JobStatus = 'pending' | 'success' | 'error';

export interface RecommendationJob {
  eventId: string;
  requestId: string;
  fieldId: string;
  targetSeason: string;
  targetYear: number;
  status: JobStatus;
  source?: string;
  durationMs?: number;
  errorCode?: string;
  error?: string;
  response?: RecommendationQueryResponse;
  createdAt: Date;
  updatedAt: Date;
}

interface RecommendationsJobsState {
  // Jobs indexed by requestId or eventId
  jobs: Map<string, RecommendationJob>;

  // Active field ID for filtering jobs
  activeFieldId: string | null;

  // Broker availability status
  kafkaAvailable: boolean;
  kafkaErrorMessage: string | null;

  // Actions
  enqueueJob: (payload: {
    eventId: string;
    requestId: string;
    fieldId: string;
    targetSeason: string;
    targetYear: number;
  }) => void;

  applyResult: (message: RecommendationResultMessage) => void;

  setActiveField: (fieldId: string | null) => void;

  setKafkaStatus: (available: boolean, errorMessage?: string) => void;

  getActiveJobs: () => RecommendationJob[];

  getPendingCount: () => number;

  getJobsByField: (fieldId: string) => RecommendationJob[];

  getLatestJobs: (limit?: number) => RecommendationJob[];

  clearJobs: () => void;
}

export const useRecommendationsJobs = create<RecommendationsJobsState>((set, get) => ({
  jobs: new Map(),
  activeFieldId: null,
  kafkaAvailable: true,
  kafkaErrorMessage: null,

  enqueueJob: (payload) => {
    const job: RecommendationJob = {
      eventId: payload.eventId,
      requestId: payload.requestId,
      fieldId: payload.fieldId,
      targetSeason: payload.targetSeason,
      targetYear: payload.targetYear,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => {
      const newJobs = new Map(state.jobs);
      newJobs.set(payload.requestId, job);
      return { jobs: newJobs };
    });
  },

  applyResult: (message) => {
    const job = get().jobs.get(message.request_id);

    if (!job) {
      console.warn(`Job not found for request_id: ${message.request_id}`);
      return;
    }

    const updatedJob: RecommendationJob = {
      ...job,
      status: message.status,
      source: message.source || job.source,
      durationMs: message.duration_ms || job.durationMs,
      errorCode: message.error_code || undefined,
      error: message.error || undefined,
      response: message.response as RecommendationQueryResponse | undefined,
      updatedAt: new Date(),
    };

    set((state) => {
      const newJobs = new Map(state.jobs);
      newJobs.set(message.request_id, updatedJob);

      // Check if this is a Kafka error
      if (message.error_code === 'KafkaError') {
        return {
          jobs: newJobs,
          kafkaAvailable: false,
          kafkaErrorMessage: message.error || 'Сервис сообщений недоступен',
        };
      }

      return { jobs: newJobs };
    });
  },

  setActiveField: (fieldId) => {
    set({ activeFieldId: fieldId });
  },

  setKafkaStatus: (available, errorMessage) => {
    set({
      kafkaAvailable: available,
      kafkaErrorMessage: errorMessage || null,
    });
  },

  getActiveJobs: () => {
    const { jobs, activeFieldId } = get();
    if (!activeFieldId) return [];

    return Array.from(jobs.values())
      .filter((job) => job.fieldId === activeFieldId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getPendingCount: () => {
    const jobs = get().jobs;
    return Array.from(jobs.values()).filter((job) => job.status === 'pending').length;
  },

  getJobsByField: (fieldId) => {
    const jobs = get().jobs;
    return Array.from(jobs.values())
      .filter((job) => job.fieldId === fieldId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  getLatestJobs: (limit = 10) => {
    const jobs = get().jobs;
    return Array.from(jobs.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  },

  clearJobs: () => {
    set({ jobs: new Map() });
  },
}));

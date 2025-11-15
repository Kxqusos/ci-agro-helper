import { z } from 'zod';

/**
 * Zod schemas for SSE event validation based on recommendations/kafka/schemas.py
 */

// ResultStatus: "success" | "error"
export const ResultStatusSchema = z.enum(['success', 'error']);

// Season type
export const SeasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter']);

// RecommendationResultMessage schema
// Matches recommendations/kafka/schemas.py:RecommendationResultMessage
export const RecommendationResultMessageSchema = z.object({
  event_id: z.string().uuid(),
  trace_id: z.string().nullable().optional(),
  processed_at: z.string().datetime(),
  status: ResultStatusSchema,
  field_id: z.string(),
  target_season: SeasonSchema,
  target_year: z.number().int().min(2024).max(2100),
  request_id: z.string(),
  duration_ms: z.number().nullable().optional(),
  response: z.any().nullable().optional(), // RecommendationQueryResponse
  error: z.string().nullable().optional(),
  error_code: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});

export type RecommendationResultMessage = z.infer<typeof RecommendationResultMessageSchema>;
export type ResultStatus = z.infer<typeof ResultStatusSchema>;
export type Season = z.infer<typeof SeasonSchema>;

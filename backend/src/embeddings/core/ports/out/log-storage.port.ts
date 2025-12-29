import { LogEmbedding } from '../../domain/embedding.entity';

/**
 * Watermark info for tracking embedding progress.
 */
export interface Watermark {
  lastEventId: any;
  lastEventTimestamp: Date;
}

/**
 * Outbound port for log storage (MongoDB).
 * Focused on operations needed for the embedding lifecycle.
 */
export abstract class LogStoragePort {
  /**
   * Retrieves the last processed watermark for a given source.
   */
  abstract getWatermark(source: string): Promise<Watermark | null>;

  /**
   * Retrieves logs that need embedding starting after the given watermark.
   */
  abstract findLogsAfterWatermark(
    source: string,
    watermark: Watermark | null,
    limit: number,
  ): Promise<LogEmbedding[]>;

  /**
   * Saves embedding results to the destination collection and updates the watermark.
   */
  abstract saveEmbeddingsAndUpdateWatermark(
    source: string,
    results: Array<{
      eventId: any;
      requestId: string;
      summary: string;
      embedding: number[];
      model: string;
    }>,
    newWatermark: Watermark,
  ): Promise<void>;

  /**
   * Logs a failure for a specific request.
   */
  abstract logFailure(requestId: string, reason: string): Promise<void>;

  /**
   * Performs semantic search using vector similarity.
   */
  abstract vectorSearch(vector: number[], limit: number): Promise<any[]>;
}

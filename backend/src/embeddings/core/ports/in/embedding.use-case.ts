import { LogEmbedding } from '../../domain/embedding.entity';

/**
 * Inbound port (Use Case) for the embedding module.
 */
export abstract class EmbeddingUseCase {
  /**
   * Processes a batch of logs that have not yet been embedded.
   * @param limit The maximum number of logs to process in this batch.
   * @returns The number of successfully processed logs.
   */
  abstract processPendingLogs(limit: number): Promise<number>;

  /**
   * Manually trigger embedding for a specific request ID.
   * Useful for targeted testing or re-processing.
   */
  abstract embedByRequestId(requestId: string): Promise<void>;

  /**
   * Performs semantic search using vector similarity.
   */
  abstract search(query: string, limit?: number): Promise<any[]>;
}

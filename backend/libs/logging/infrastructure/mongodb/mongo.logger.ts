import { Injectable, Logger } from '@nestjs/common';
import { LoggerPort } from '../../core/port/out/logger.port';
import { WideEvent } from '../../core/domain/wide-event';
import { MongoConnectionClient } from './mongo.client';

/**
 * MongoLogger - Infrastructure layer implementation of LoggerPort.
 * Persists Wide Events to a MongoDB Time-series collection.
 */
@Injectable()
export class MongoLogger extends LoggerPort {
  private readonly internalLogger = new Logger(MongoLogger.name);
  private readonly collectionName = 'wide_events';

  constructor(private readonly mongoConnectionClient: MongoConnectionClient) {
    super();
  }

  /**
   * Log a Wide Event to MongoDB.
   * Converts timestamp string to Date object for Time-series optimization.
   */
  async log(event: WideEvent): Promise<void> {
    try {
      // Convert WideEvent to MongoDB Document
      // Note: In Phase 2, we convert the ISO string timestamp to a Date object
      // to leverage MongoDB's native Time-series optimizations.
      const document = {
        ...event,
        timestamp: new Date(event.timestamp),
      };

      await this.mongoConnectionClient
        .getCollection(this.collectionName)
        .insertOne(document);
    } catch (error) {
      // Logging failures should not break the application (Non-blocking principle)
      this.internalLogger.error(
        `Failed to persist log to MongoDB: ${error.message}`,
      );
    }
  }
}

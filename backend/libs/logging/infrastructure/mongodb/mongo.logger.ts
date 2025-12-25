import { Injectable } from '@nestjs/common';
import { Logger } from '../../core/domain/logger.interface';
import { WideEvent } from '../../core/domain/wide-event';
import { MongoConnectionService } from './mongo-connection.service';

/**
 * MongoLogger - Infrastructure layer implementation of Logger interface.
 * Persists Wide Events to a MongoDB Time-series collection.
 */
@Injectable()
export class MongoLogger implements Logger {
  private readonly collectionName = 'wide_events';

  constructor(private readonly mongoConnection: MongoConnectionService) {}

  /**
   * Log a Wide Event to MongoDB.
   * Converts timestamp string to Date object for Time-series optimization.
   */
  async log(event: WideEvent): Promise<void> {
    try {
      const collection = this.mongoConnection.getCollection(this.collectionName);

      // Convert timestamp to Date object for MongoDB Time-series optimization
      const document = {
        ...event,
        timestamp: new Date(event.timestamp),
      };

      // Always create/insert only
      await collection.insertOne(document);
    } catch (error) {
      // Logging failures should not break the application
      // In production, consider a fallback mechanism
      console.error('Failed to log to MongoDB:', error);
    }
  }
}


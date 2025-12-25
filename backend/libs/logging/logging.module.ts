import { Module, Global } from '@nestjs/common';
import { LoggingService } from './services/logging.service';
import { ContextService } from './services/context.service';
import { FileLogger } from './infrastructure/file/file.logger';
import { MongoLogger } from './infrastructure/mongodb/mongo.logger';
import { MongoConnectionService } from './infrastructure/mongodb/mongo-connection.service';

/**
 * LoggingModule - NestJS module for the logging library.
 *
 * This module is marked as @Global() so it can be imported once in AppModule
 * and used throughout the application without re-importing.
 *
 * The Logger interface is provided via a token, allowing easy replacement
 * of the implementation (e.g., FileLogger -> MongoLogger in Phase 2).
 */
@Global()
@Module({
  providers: [
    ContextService,
    LoggingService,
    MongoConnectionService,
    {
      provide: 'LOGGER',
      useClass: MongoLogger,
    },
    // Keep both available if needed directly
    FileLogger,
    MongoLogger,
  ],
  exports: [LoggingService, ContextService],
})
export class LoggingModule {}

import { Module, Global } from '@nestjs/common';
import { LoggingService } from './services/logging.service';
import { ContextService } from './services/context.service';
import { FileLogger } from './infrastructure/file/file.logger';
import { MongoLogger } from './infrastructure/mongodb/mongo.logger';
import { MongoConnectionClient } from './infrastructure/mongodb/mongo.client';
import { LoggerPort } from './core/port/out/logger.port';

/**
 * LoggingModule - NestJS module for the logging library.
 *
 * This module is marked as @Global() so it can be imported once in AppModule
 * and used throughout the application without re-importing.
 *
 */
@Global()
@Module({
  providers: [
    ContextService,
    LoggingService,
    MongoConnectionClient,
    {
      provide: LoggerPort,
      useClass: MongoLogger,
    },
    // Keep individual implementations available for explicit use if needed
    FileLogger,
    MongoLogger,
  ],
  exports: [LoggingService, ContextService, LoggerPort],
})
export class LoggingModule {}

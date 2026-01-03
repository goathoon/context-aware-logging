import { Module, Global, Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  LoggingService,
  ContextService,
  MqConsumerService,
} from "libs/logging/service";
import {
  MongoLogger,
  MongoConnectionClient,
  KafkaProducerClient,
  KafkaConsumerClient,
  KafkaProducer,
  KafkaLogger,
  FileLogger,
} from "@logging/infrastructure";
import { LoggerPort } from "@logging/out-ports";
import { MqProducerPort } from "@logging/out-ports";
import { LoggingInterceptor } from "@logging/presentation";
import { SamplingPolicy } from "@logging/domain";

/**
 * LoggingModule - NestJS module for the logging library.
 *
 * This module is marked as @Global() so it can be imported once in AppModule
 * and used throughout the application without re-importing.
 *
 * Phase 5: MQ Integration
 * - If MQ_ENABLED=true, uses KafkaLogger (publishes to Kafka)
 * - Otherwise, uses MongoLogger directly (synchronous logging)
 * - MqConsumerService runs in background to consume and persist logs
 */

const storageType = process.env.STORAGE_TYPE || "mongodb";

const providers: Provider[] = [
  ContextService,
  SamplingPolicy,
  LoggingService,
  LoggingInterceptor,
];

if (storageType === "file") {
  providers.push(FileLogger);
  providers.push({
    provide: LoggerPort,
    useClass: FileLogger,
  });
} else if (storageType === "mongodb") {
  providers.push(MongoConnectionClient, MongoLogger);
  providers.push({
    provide: LoggerPort,
    useClass: MongoLogger,
  });
} else if (storageType === "kafka") {
  providers.push(
    MongoConnectionClient,
    MongoLogger,
    KafkaProducerClient,
    KafkaConsumerClient,
    KafkaProducer,
    {
      provide: MqProducerPort,
      useClass: KafkaProducer,
    },
    {
      provide: LoggerPort,
      useFactory: (producer, mongo, config) =>
        new KafkaLogger(producer, mongo, config),
      inject: [MqProducerPort, MongoLogger, ConfigService],
    },
    MqConsumerService,
  );
}

@Global()
@Module({
  providers: providers,
  exports: [LoggingService, ContextService, LoggingInterceptor],
})
export class LoggingModule {}

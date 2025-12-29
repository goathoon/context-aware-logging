import { Module } from '@nestjs/common';
import { EmbeddingUseCase } from './core/ports/in/embedding.use-case';
import { EmbeddingPort } from './core/ports/out/embedding.port';
import { LogStoragePort } from './core/ports/out/log-storage.port';
import { EmbeddingService } from './services/embedding.service';
import { VoyageAdapter } from './infrastructure/embed-model/voyage.adapter';
import { VoyageClient } from './infrastructure/embed-model/voyage.client';
import { MongoLogAdapter } from './infrastructure/mongodb/mongo-log.adapter';
import { MongoEmbeddingConnection } from './infrastructure/mongodb/db.connect';
import { EmbeddingController } from './controllers/embedding.controller';

@Module({
  controllers: [EmbeddingController],
  providers: [
    // Services
    {
      provide: EmbeddingUseCase,
      useClass: EmbeddingService,
    },
    // Outbound Adapters
    {
      provide: EmbeddingPort,
      useClass: VoyageAdapter,
    },
    {
      provide: LogStoragePort,
      useClass: MongoLogAdapter,
    },
    // Infrastructure Clients
    VoyageClient,
    MongoEmbeddingConnection,
  ],
  exports: [EmbeddingUseCase],
})
export class EmbeddingsModule {}


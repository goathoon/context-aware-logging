import { Injectable } from '@nestjs/common';
import { EmbeddingPort } from '../../core/ports/out/embedding.port';
import { EmbeddingResult } from '../../core/domain/embedding.entity';
import { VoyageClient } from './voyage.client';

@Injectable()
export class VoyageAdapter extends EmbeddingPort {
  constructor(private readonly client: VoyageClient) {
    super();
  }

  async createEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await this.client.createEmbeddings([text]);

    return {
      embedding: response.data[0].embedding,
      model: response.model,
      usage: {
        totalTokens: response.usage.totalTokens,
      },
    };
  }

  async createBatchEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await this.client.createEmbeddings(texts);

    return response.data.map((item: any) => ({
      embedding: item.embedding,
      model: response.model,
      usage: {
        totalTokens: response.usage.totalTokens / texts.length, // Rough estimation per item
      },
    }));
  }
}

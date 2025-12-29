import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoyageAIClient } from 'voyageai';

/**
 * VoyageClient - Infrastructure client for interacting with the Voyage AI API
 * using the official SDK.
 */
@Injectable()
export class VoyageClient {
  private readonly logger = new Logger(VoyageClient.name);
  private readonly client: VoyageAIClient;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('EMBEDDING_MODEL_KEY');
    this.model =
      this.configService.get<string>('EMBEDDING_MODEL') || 'voyage-3-lite';

    if (!apiKey) {
      this.logger.warn(
        'EMBEDDING_MODEL_KEY is not defined. Embedding operations will fail.',
      );
    }

    this.client = new VoyageAIClient({
      apiKey: apiKey || '',
    });
  }

  /**
   * Generates embeddings for the given inputs using the official SDK.
   */
  async createEmbeddings(inputs: string[]): Promise<any> {
    try {
      return await this.client.embed({
        input: inputs,
        model: this.model,
      });
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error.message}`);
      throw error;
    }
  }

  getModelName(): string {
    return this.model;
  }
}

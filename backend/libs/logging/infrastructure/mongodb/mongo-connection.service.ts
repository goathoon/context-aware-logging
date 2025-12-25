import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { MongoClient, Db, Collection, Document } from 'mongodb';

@Injectable()
export class MongoConnectionService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient;
  private db: Db;
  private readonly uri: string;
  private readonly dbName: string;

  constructor() {
    // Added directConnection=true to handle replica set local resolution issue
    this.uri =
      process.env.MONGODB_URI ||
      'mongodb://eventsAdmin:eventsAdmin@localhost:27016/wide_events?authSource=wide_events&directConnection=true';
    // Extract DB name from URI or use default
    this.dbName = 'wide_events';
  }

  async onModuleInit() {
    this.client = new MongoClient(this.uri);
    try {
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      console.log(
        `Connected to MongoDB: ${this.dbName} on port 27016 (directConnection=true)`,
      );
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }

  getCollection<T extends Document = any>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }
}

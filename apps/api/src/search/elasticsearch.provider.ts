import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  public client: Client;

  constructor(private readonly config: ConfigService) {
    this.client = new Client({
      node: this.config.get<string>('ELASTICSEARCH_URL', 'http://localhost:3102'),
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('Connected to Elasticsearch');
    } catch (err) {
      this.logger.error('Failed to connect to Elasticsearch', err);
    }
  }
}

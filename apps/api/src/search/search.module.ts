import { Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.provider';
import { SearchService } from './search.service';

@Module({
  providers: [ElasticsearchService, SearchService],
  exports: [SearchService],
})
export class SearchModule {}

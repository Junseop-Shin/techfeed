import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrawlerSource, CrawlerSourceSchema } from './source.schema';
import { SourcesService } from './sources.service';
import { SourcesController } from './sources.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CrawlerSource.name, schema: CrawlerSourceSchema }]),
  ],
  controllers: [SourcesController],
  providers: [SourcesService],
})
export class SourcesModule {}

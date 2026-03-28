import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Content, ContentSchema } from './content.schema';
import { ContentsController } from './contents.controller';
import { ContentsService } from './contents.service';
import { SearchModule } from '../search/search.module';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }]),
    SearchModule,
    AppCacheModule,
  ],
  controllers: [ContentsController],
  providers: [ContentsService],
})
export class ContentsModule {}

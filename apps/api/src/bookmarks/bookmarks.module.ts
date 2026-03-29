import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Bookmark } from './bookmark.entity';
import { BookmarksService } from './bookmarks.service';
import { BookmarksController } from './bookmarks.controller';
import { Content, ContentSchema } from '../contents/content.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bookmark]),
    MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }]),
  ],
  providers: [BookmarksService],
  controllers: [BookmarksController],
  exports: [BookmarksService],
})
export class BookmarksModule {}

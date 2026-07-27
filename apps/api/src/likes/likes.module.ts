import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { Like } from './like.entity';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { LikesScheduler } from './likes.scheduler';
import { Content, ContentSchema } from '../contents/content.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([Like]),
    MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }]),
  ],
  providers: [LikesService, LikesScheduler],
  controllers: [LikesController],
  exports: [LikesService],
})
export class LikesModule {}

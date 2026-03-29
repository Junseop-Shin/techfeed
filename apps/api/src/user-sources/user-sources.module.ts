import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSource } from './user-source.entity';
import { UserSourcesService } from './user-sources.service';
import { UserSourcesController } from './user-sources.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserSource])],
  controllers: [UserSourcesController],
  providers: [UserSourcesService],
})
export class UserSourcesModule {}

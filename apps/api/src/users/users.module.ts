import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Subscription } from '../subscriptions/subscription.entity';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AppCacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Subscription]),
    SubscriptionsModule,
    AppCacheModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

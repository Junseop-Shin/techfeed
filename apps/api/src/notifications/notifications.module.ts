import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Content, ContentSchema } from '../contents/content.schema';
import { UsersModule } from '../users/users.module';
import { PushModule } from '../push/push.module';
import { AppCacheModule } from '../cache/cache.module';
import { BookmarksModule } from '../bookmarks/bookmarks.module';
import { NotificationsService } from './notifications.service';
import { NotificationsScheduler } from './notifications.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Content.name, schema: ContentSchema }]),
    UsersModule,
    PushModule,
    AppCacheModule,
    BookmarksModule,
  ],
  providers: [NotificationsService, NotificationsScheduler],
})
export class NotificationsModule {}

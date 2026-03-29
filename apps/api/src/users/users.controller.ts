import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService, UserStats } from './users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { RedisProvider } from '../cache/redis.provider';

class UpdateTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

class UpdateFcmTokenDto {
  @IsString()
  fcm_token: string;
}

class UpdateNameDto {
  @IsString()
  @MaxLength(30)
  name: string;
}

class UpdatePreferencesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjects?: string[];
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly redisProvider: RedisProvider,
  ) {}

  @Post('badge/reset')
  async resetBadge(@Request() req: { user: { userId: string } }) {
    await this.redisProvider.client.set(`badge:${req.user.userId}`, 0);
    return { success: true };
  }

  @Get()
  async getMe(@Request() req: { user: { userId: string; email: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
      tags: user.subscriptions?.map((s) => s.tag) ?? [],
    };
  }

  @Get('stats')
  async getStats(@Request() req: { user: { userId: string } }): Promise<UserStats> {
    return this.usersService.getStats(req.user.userId);
  }

  @Get('preferences')
  async getPreferences(@Request() req: { user: { userId: string } }) {
    const [channels, subjects] = await Promise.all([
      this.subscriptionsService.getByType(req.user.userId, 'channel'),
      this.subscriptionsService.getByType(req.user.userId, 'subject'),
    ]);

    return {
      channels: channels.map((s) => s.tag),
      subjects: subjects.map((s) => s.tag),
    };
  }

  @Patch('preferences')
  async updatePreferences(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdatePreferencesDto,
  ) {
    const ops: Promise<void>[] = [];

    if (dto.channels !== undefined) {
      ops.push(this.subscriptionsService.syncChannels(req.user.userId, dto.channels));
    }
    if (dto.subjects !== undefined) {
      ops.push(this.subscriptionsService.syncSubjects(req.user.userId, dto.subjects));
    }

    await Promise.all(ops);
    return { success: true };
  }

  @Put('tags')
  async updateTags(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateTagsDto,
  ) {
    await this.usersService.updateTags(req.user.userId, dto.tags);
    return { success: true };
  }

  @Put('fcm-token')
  async updateFcmToken(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateFcmTokenDto,
  ) {
    await this.usersService.updateFcmToken(req.user.userId, dto.fcm_token);
    return { success: true };
  }

  @Delete('fcm-token')
  async removeFcmToken(@Request() req: { user: { userId: string } }) {
    await this.usersService.removeFcmToken(req.user.userId);
    return { success: true };
  }

  @Patch('name')
  async updateName(
    @Request() req: { user: { userId: string } },
    @Body() dto: UpdateNameDto,
  ) {
    await this.usersService.updateName(req.user.userId, dto.name);
    return { success: true };
  }
}

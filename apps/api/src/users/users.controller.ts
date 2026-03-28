import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

class UpdateTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

class UpdateFcmTokenDto {
  @IsString()
  fcm_token: string;
}

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}

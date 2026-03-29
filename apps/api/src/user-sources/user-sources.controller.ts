import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserSourcesService } from './user-sources.service';
import { IsString } from 'class-validator';

class FollowSourceDto {
  @IsString()
  source_type: string;
}

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('users/me/sources')
export class UserSourcesController {
  constructor(private readonly service: UserSourcesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getMySourceIds(@Request() req: AuthRequest) {
    return this.service.getByUser(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':sourceId')
  @HttpCode(200)
  follow(
    @Request() req: AuthRequest,
    @Param('sourceId') sourceId: string,
    @Body() dto: FollowSourceDto,
  ) {
    return this.service.follow(req.user.userId, sourceId, dto.source_type);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':sourceId')
  @HttpCode(204)
  unfollow(@Request() req: AuthRequest, @Param('sourceId') sourceId: string) {
    return this.service.unfollow(req.user.userId, sourceId);
  }
}

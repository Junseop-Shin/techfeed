import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users/me/bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  async findAll(@Request() req: { user: { userId: string } }) {
    return this.bookmarksService.findByUserId(req.user.userId);
  }

  @Post(':contentId')
  async add(
    @Request() req: { user: { userId: string } },
    @Param('contentId') contentId: string,
  ) {
    await this.bookmarksService.add(req.user.userId, contentId);
    return { success: true };
  }

  @Delete(':contentId')
  async remove(
    @Request() req: { user: { userId: string } },
    @Param('contentId') contentId: string,
  ) {
    await this.bookmarksService.remove(req.user.userId, contentId);
    return { success: true };
  }
}

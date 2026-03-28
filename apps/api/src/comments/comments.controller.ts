import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';

class CreateCommentDto {
  @IsString()
  @MaxLength(500)
  body: string;
}

@Controller('contents/:contentId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Param('contentId') contentId: string) {
    const comments = await this.commentsService.findByContentId(contentId);
    return comments.map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      user: {
        id: c.user.id,
        name: c.user.name,
      },
    }));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('contentId') contentId: string,
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.commentsService.create(req.user.userId, contentId, dto.body);
    return {
      id: comment.id,
      body: comment.body,
      created_at: comment.created_at,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('contentId') _contentId: string,
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: string } },
  ) {
    await this.commentsService.delete(req.user.userId, id);
    return { success: true };
  }
}

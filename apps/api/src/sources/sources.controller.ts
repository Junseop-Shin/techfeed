import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SourcesService } from './sources.service';
import { CrawlerSource } from './source.schema';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(@Query('type') type?: string) {
    return this.sourcesService.findAll(type);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: Partial<CrawlerSource>) {
    return this.sourcesService.create(body);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() body: Partial<CrawlerSource>) {
    return this.sourcesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.sourcesService.remove(id);
  }
}

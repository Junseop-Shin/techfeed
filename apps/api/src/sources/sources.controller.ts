import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
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
  create(@Body() body: Partial<CrawlerSource>) {
    return this.sourcesService.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<CrawlerSource>) {
    return this.sourcesService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sourcesService.remove(id);
  }
}

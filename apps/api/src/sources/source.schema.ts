import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SourceDocument = CrawlerSource & Document;

@Schema({ collection: 'crawler_sources', timestamps: true })
export class CrawlerSource {
  @Prop({ required: true, enum: ['blog', 'youtube', 'job'] })
  type: 'blog' | 'youtube' | 'job';

  @Prop({ required: true })
  name: string;

  @Prop()
  url?: string; // RSS URL for blogs

  @Prop()
  channelId?: string; // YouTube channel ID

  @Prop()
  subType?: string; // e.g. 'wanted-api', 'jumpit-api' for job sources

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: true })
  enabled: boolean;
}

export const CrawlerSourceSchema = SchemaFactory.createForClass(CrawlerSource);

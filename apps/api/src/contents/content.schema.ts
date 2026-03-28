import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as crypto from 'crypto';

export type ContentDocument = Content & Document;

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Content {
  @Prop({ required: true, enum: ['blog', 'youtube', 'job'] })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, unique: true })
  url: string;

  @Prop({ required: true, unique: true, index: true })
  url_hash: string;

  @Prop()
  summary?: string;

  @Prop()
  ai_summary?: string;

  @Prop()
  thumbnail?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: true })
  source_name: string;

  @Prop({ required: true })
  published_at: Date;

  @Prop({ default: false })
  es_indexed: boolean;

  @Prop()
  created_at: Date;
}

export const ContentSchema = SchemaFactory.createForClass(Content);

export function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

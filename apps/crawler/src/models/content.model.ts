import mongoose, { Document, Schema } from 'mongoose';
import * as crypto from 'crypto';

export interface IContent {
  type: 'blog' | 'youtube' | 'job';
  title: string;
  url: string;
  url_hash: string;
  summary?: string;
  thumbnail?: string;
  tags: string[];
  source_name: string;
  published_at: Date;
  es_indexed: boolean;
  created_at: Date;
}

export type ContentDocument = IContent & Document;

const ContentSchema = new Schema<ContentDocument>(
  {
    type: { type: String, required: true, enum: ['blog', 'youtube', 'job'] },
    title: { type: String, required: true },
    url: { type: String, required: true, unique: true },
    url_hash: { type: String, required: true, unique: true, index: true },
    summary: { type: String },
    thumbnail: { type: String },
    tags: { type: [String], default: [] },
    source_name: { type: String, required: true },
    published_at: { type: Date, required: true },
    es_indexed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } },
);

export const ContentModel = mongoose.model<ContentDocument>('Content', ContentSchema);

export function hashUrl(url: string): string {
  return crypto.createHash('sha256').update(url).digest('hex');
}

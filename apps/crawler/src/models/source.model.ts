import mongoose, { Document, Schema } from 'mongoose';

export interface CrawlerSourceDoc extends Document {
  type: 'blog' | 'youtube' | 'job';
  name: string;
  url?: string;
  channelId?: string;
  subType?: string; // 'wanted-api' | 'jumpit-api' for job sources
  tags: string[];
  enabled: boolean;
}

const CrawlerSourceSchema = new Schema(
  {
    type: { type: String, enum: ['blog', 'youtube', 'job'], required: true },
    name: { type: String, required: true },
    url: { type: String },
    channelId: { type: String },
    subType: { type: String },
    tags: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
  },
  { collection: 'crawler_sources', timestamps: true }
);

export const CrawlerSourceModel = mongoose.model<CrawlerSourceDoc>(
  'CrawlerSource',
  CrawlerSourceSchema
);

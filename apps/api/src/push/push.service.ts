import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  async send(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
      });
    } catch (err) {
      this.logger.error(`FCM send failed for token ${token.slice(0, 10)}...`, err);
    }
  }

  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (tokens.length === 0) return;

    const chunks = this.chunkArray(tokens, 500);
    for (const chunk of chunks) {
      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          data,
        });
        this.logger.log(
          `Multicast: ${response.successCount} success, ${response.failureCount} failed`,
        );
      } catch (err) {
        this.logger.error('FCM multicast failed', err);
      }
    }
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

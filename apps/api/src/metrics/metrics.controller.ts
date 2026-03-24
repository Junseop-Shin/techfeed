import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

const ALLOWED_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /metrics
   * Prometheus scrape endpoint. Returns metrics in text/plain exposition format.
   * Access is restricted to localhost.
   */
  @Get()
  async getMetrics(@Req() req: Request, @Res() res: Response): Promise<void> {
    const ip = req.ip ?? req.socket.remoteAddress ?? '';
    if (!ALLOWED_IPS.some((a) => ip.includes(a))) {
      res.status(403).send('Forbidden');
      return;
    }
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(await this.metricsService.getMetrics());
  }
}

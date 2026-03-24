import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    res.on('finish', () => {
      const route = req.route?.path ?? req.path;
      this.metricsService.apiRequestsTotal.inc({
        method: req.method,
        route,
        status: String(res.statusCode),
      });
    });

    next();
  }
}

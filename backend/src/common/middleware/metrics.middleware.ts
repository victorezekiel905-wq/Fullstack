import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = (Date.now() - startTime) / 1000;
      const { statusCode } = res;
      const route = req.route?.path || originalUrl;

      this.metricsService.recordHttpRequest(method, route, statusCode, duration);

      if (statusCode >= 400) {
        this.metricsService.recordHttpError(method, route, `HTTP_${statusCode}`);
      }
    });

    next();
  }
}

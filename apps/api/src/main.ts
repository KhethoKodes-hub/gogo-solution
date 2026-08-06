/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configuredOrigins = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN;
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:4200'];
  const configuredList = configuredOrigins
    ? configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  const allowedOrigins = new Set(
    [...defaultOrigins, ...configuredList].map((origin) => origin.replace(/\/$/, '')),
  );

  app.enableCors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin?.replace(/\/$/, '');
      const isLocalhost = typeof normalizedOrigin === 'string'
        && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalizedOrigin);

      if (!origin || isLocalhost || (normalizedOrigin && allowedOrigins.has(normalizedOrigin))) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();

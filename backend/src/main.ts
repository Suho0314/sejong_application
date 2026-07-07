import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const LOCAL_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
  'http://localhost:19006',
  'http://127.0.0.1:19006',
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') ?? '3000');
  const configuredOrigins = (configService.get<string>('CORS_ORIGIN') ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be a valid TCP port number.');
  }

  if (configuredOrigins.includes('*')) {
    throw new Error('CORS_ORIGIN must contain explicit origins, not "*".');
  }

  const allowedOrigins = new Set([...LOCAL_ALLOWED_ORIGINS, ...configuredOrigins]);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(port, '0.0.0.0');
}

void bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,POST,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`🚀 API running at: http://localhost:${port}/api`);
  logger.log(`📖 Endpoints:`);
  logger.log(`   POST /api/extract       — Universal downloader (YT, TikTok, dll)`);
  logger.log(`   POST /api/extract/info  — Metadata / info saja`);
  logger.log(`   POST /api/extract/audio — Ambil audio (mp3)`);
  logger.log(`   POST /api/instagram     — Instagram posts/reels/stories`);
  logger.log(`   POST /api/spotify       — Spotify track/album/playlist`);
  logger.log(`   GET  /api/health        — Health check`);
  logger.log(`   GET  /api/sites         — Daftar situs yang didukung`);
}

bootstrap();

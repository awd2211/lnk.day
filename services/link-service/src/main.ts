import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  logger.log('Creating Nest application...');

  const app = await NestFactory.create(AppModule);
  logger.log('Nest application created');

  // 启用优雅关闭钩子
  app.enableShutdownHooks();

  // API 版本管理
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  logger.log('Middleware configured');

  const port = process.env.PORT || 60003;
  logger.log(`Starting to listen on port ${port}...`);

  await app.listen(port, '0.0.0.0');
  logger.log(`Link Service running on port ${port}`);

  // 优雅关闭处理
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    try {
      await app.close();
      logger.log('Application closed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
bootstrap();

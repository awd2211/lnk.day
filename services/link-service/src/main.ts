import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Creating Nest application...');

  const app = await NestFactory.create(AppModule);
  logger.log('Nest application created');

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  logger.log('Middleware configured');

  // Skip Swagger for now to debug startup issue
  logger.log('Skipping Swagger setup');

  const port = process.env.PORT || 60003;
  logger.log(`Starting to listen on port ${port}...`);

  // Try binding to all interfaces
  await app.listen(port, '0.0.0.0');
  logger.log(`Link Service running on port ${port}`);
  console.log(`Link Service running on port ${port}`);
}
bootstrap();

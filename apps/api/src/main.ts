import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  const configuredOrigins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
  const localOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? configuredOrigins
      : [...new Set([...configuredOrigins, ...localOrigins])],
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Nexus 2.0 API running → http://localhost:${port}/api`);
}
void bootstrap();

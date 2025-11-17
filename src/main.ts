import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Enable debug logging
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Get logger instance
  const logger = new Logger('Bootstrap');
  
  // ✅ Allow both local and Vercel frontends
  const allowedOrigins = [
  'http://localhost:3000',
  'https://gpt-register-pay-fe-bqh5.vercel.app',
  'https://gpt-register-pay-fe-bqh5-git-frontend-sameers-projects-ed89dcfa.vercel.app', // preview
  'https://gpt-register-pay-fe-bqh5-3u0b1fdh4-sameers-projects-ed89dcfa.vercel.app', // preview
];


app.enableCors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('vercel.app') || origin === 'http://localhost:3000') {
      callback(null, true);
    } else {
      callback(new Error(`Blocked by CORS: ${origin}`));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
});


  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`✅ Application is running on: ${await app.getUrl()}`);
  logger.debug('Debug mode is enabled');
}

bootstrap();
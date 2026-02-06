import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AppDataSource } from './config/data-source';
import { EnterpriseLoggerService } from './common/services/enterprise-logger.service';

async function bootstrap() {
  const startTime = Date.now();
  const logger = new EnterpriseLoggerService();
  logger.setContext('Bootstrap');

  logger.log('╔════════════════════════════════════════════════════════════╗');
  logger.log('║  🎓 SynergySwift Enterprise Backend - Starting...          ║');
  logger.log('╚════════════════════════════════════════════════════════════╝');

  // Critical environment validation
  const requiredEnvVars = [
    'DATABASE_HOST',
    'DATABASE_USER',
    'DATABASE_PASSWORD',
    'DATABASE_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CORS_ORIGIN',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
  if (missingVars.length > 0) {
    logger.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
  }

  const env = process.env.NODE_ENV || 'development';
  const isProduction = ['production', 'render-free', 'enterprise'].includes(env);

  logger.log(`Environment: ${env.toUpperCase()}`);
  logger.log(`Port Configuration: ${process.env.PORT || '3000'} (dynamic)`);

  // Initialize database with auto-migration
  try {
    logger.log('📦 Initializing database connection...');
    await AppDataSource.initialize();
    logger.log('✅ Database connected successfully');

    logger.log('🔄 Running database migrations...');
    const migrations = await AppDataSource.runMigrations({ transaction: 'all' });
    if (migrations.length > 0) {
      logger.log(`✅ Applied ${migrations.length} migration(s):`);
      migrations.forEach(m => logger.log(`   - ${m.name}`));
    } else {
      logger.log('✅ No pending migrations');
    }
  } catch (error) {
    logger.error('❌ Database initialization failed', error.stack);
    process.exit(1);
  }

  // Create Nest application with enterprise logger
  const app = await NestFactory.create(AppModule, {
    logger,
    bodyParser: true,
  });

  // Enterprise Security - Helmet with strict CSP
  if (process.env.ENABLE_HELMET !== 'false') {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        hsts: {
          maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10),
          includeSubDomains: true,
          preload: true,
        },
        frameguard: { action: 'deny' },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      })
    );
    logger.log('✅ Helmet security headers enabled');
  }

  // CORS with strict allowlist (no wildcards in production)
  const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['*'];
  
  if (isProduction && corsOrigins.includes('*')) {
    logger.warn('⚠️  SECURITY WARNING: Wildcard CORS in production is not recommended');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.logSecurity('CORS Blocked', { 
          origin, 
          allowedOrigins: corsOrigins.join(', ') 
        });
        callback(new Error(`Origin ${origin} not allowed by CORS policy`));
      }
    },
    credentials: process.env.CORS_CREDENTIALS !== 'false',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Request-ID',
      'X-Tenant-ID',
    ],
    exposedHeaders: ['X-Correlation-ID', 'X-Request-ID'],
    maxAge: 3600,
  });
  logger.log(`✅ CORS configured for origins: ${corsOrigins.join(', ')}`);

  // Compression (enterprise performance)
  if (process.env.ENABLE_COMPRESSION !== 'false') {
    app.use(compression({
      threshold: 1024, // Only compress responses > 1KB
      level: 6, // Balance between speed and compression ratio
    }));
    logger.log('✅ Response compression enabled');
  }

  // Global validation pipe with strict settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: isProduction, // Hide detailed errors in production
    })
  );
  logger.log('✅ Input validation configured');

  // API versioning
  app.setGlobalPrefix('api/v1');

  // Enterprise API Documentation (Swagger)
  const config = new DocumentBuilder()
    .setTitle('SynergySwift Enterprise API')
    .setDescription(
      'Enterprise-grade School Management System API with comprehensive security, ' +
      'observability, and scalability features. Optimized for Render Free Tier deployment.'
    )
    .setVersion('3.0.0')
    .setContact(
      'SynergySwift Team',
      'https://github.com/synergyswift',
      'support@synergyswift.io'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT access token',
      },
      'JWT'
    )
    .addTag('Health', 'Health check and readiness probes')
    .addTag('Authentication', 'User authentication and JWT management')
    .addTag('Tenants', 'Multi-tenancy management')
    .addTag('Students', 'Student lifecycle management')
    .addTag('Teachers', 'Teacher management')
    .addTag('Results', 'Academic results and grading')
    .addTag('Finance', 'Fee management and payments')
    .addTag('Communication', 'Email, SMS, and WhatsApp notifications')
    .addTag('Audit', 'Audit trail and compliance logging')
    .addServer('http://localhost:3000', 'Local Development')
    .addServer('https://your-app.onrender.com', 'Render Free Tier Production')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'SynergySwift Enterprise API Docs',
    customfavIcon: 'https://synergyswift.io/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });
  logger.log('✅ API documentation available at /api/docs');

  // Graceful shutdown handlers
  app.enableShutdownHooks();

  const gracefulShutdown = async (signal: string) => {
    logger.log(`⚠️  Received ${signal}, initiating graceful shutdown...`);
    
    const shutdownTimeout = setTimeout(() => {
      logger.error('❌ Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 10000); // 10 second timeout

    try {
      await app.close();
      logger.log('✅ HTTP server closed');

      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
        logger.log('✅ Database connections closed');
      }

      clearTimeout(shutdownTimeout);
      logger.log('✅ Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during graceful shutdown', error.stack);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Unhandled exceptions and rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', String(promise), { reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error.stack);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Start server (Render requirement: 0.0.0.0 + dynamic PORT)
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = '0.0.0.0';

  await app.listen(port, host);

  const bootTime = ((Date.now() - startTime) / 1000).toFixed(2);
  const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

  logger.log('╔════════════════════════════════════════════════════════════╗');
  logger.log('║  🚀 SynergySwift Enterprise Backend - RUNNING              ║');
  logger.log('╠════════════════════════════════════════════════════════════╣');
  logger.log(`║  🌐 Server:        http://${host}:${port}/api/v1`);
  logger.log(`║  📚 API Docs:      http://${host}:${port}/api/docs`);
  logger.log(`║  ❤️  Health:        http://${host}:${port}/api/v1/health`);
  logger.log(`║  🔍 Readiness:     http://${host}:${port}/api/v1/ready`);
  logger.log('╠════════════════════════════════════════════════════════════╣');
  logger.log(`║  🌍 Environment:   ${env.toUpperCase()}`);
  logger.log(`║  ⚡ Boot Time:     ${bootTime}s`);
  logger.log(`║  💾 Memory:        ${memUsage} MB`);
  logger.log(`║  🔒 CORS Origins:  ${corsOrigins.length} configured`);
  logger.log(`║  📊 Log Level:     ${process.env.LOG_LEVEL || 'info'}`);
  logger.log('╚════════════════════════════════════════════════════════════╝');
}

bootstrap().catch((error) => {
  const logger = new EnterpriseLoggerService();
  logger.setContext('Bootstrap');
  logger.error('❌ Fatal error during bootstrap', error.stack);
  process.exit(1);
});

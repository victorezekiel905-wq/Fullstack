import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  validateSync,
  Min,
  Max,
  Matches,
  IsUrl,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  RenderFree = 'render-free',
  Enterprise = 'enterprise',
}

export class EnterpriseEnvironmentVariables {
  // Environment
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  // Database
  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  DATABASE_PORT: number = 5432;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL: boolean = false;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  DATABASE_POOL_SIZE: number = 10;

  @IsNumber()
  @Min(1000)
  @Max(60000)
  @IsOptional()
  DATABASE_CONNECTION_TIMEOUT: number = 5000;

  @IsNumber()
  @Min(5000)
  @Max(300000)
  @IsOptional()
  DATABASE_IDLE_TIMEOUT: number = 30000;

  // JWT - Enhanced Security
  @IsString()
  @Matches(/^[A-Za-z0-9+/=]{64,}$/, {
    message: 'JWT_SECRET must be at least 64 characters (base64 or hex)',
  })
  JWT_SECRET: string;

  @IsString()
  @Matches(/^[A-Za-z0-9+/=]{64,}$/, {
    message: 'JWT_REFRESH_SECRET must be at least 64 characters (base64 or hex)',
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsString()
  @IsOptional()
  JWT_ISSUER: string = 'synergyswift';

  @IsString()
  @IsOptional()
  JWT_AUDIENCE: string = 'synergyswift-api';

  // CORS - Strict Allowlist
  @IsString()
  CORS_ORIGIN: string;

  @IsBoolean()
  @IsOptional()
  CORS_CREDENTIALS: boolean = true;

  // Rate Limiting - Memory Safe
  @IsNumber()
  @Min(1)
  @Max(600)
  @IsOptional()
  RATE_LIMIT_TTL: number = 60;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  RATE_LIMIT_MAX: number = 100;

  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  RATE_LIMIT_GLOBAL_MAX: number = 1000;

  // Logging
  @IsEnum(['error', 'warn', 'info', 'debug'])
  @IsOptional()
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' = 'info';

  @IsBoolean()
  @IsOptional()
  LOG_SQL_QUERIES: boolean = false;

  // Security Headers
  @IsBoolean()
  @IsOptional()
  ENABLE_HELMET: boolean = true;

  @IsString()
  @IsOptional()
  HSTS_MAX_AGE: string = '31536000';

  // Session & Auth
  @IsNumber()
  @Min(300)
  @Max(86400)
  @IsOptional()
  SESSION_TIMEOUT: number = 900; // 15 minutes

  @IsNumber()
  @Min(3)
  @Max(10)
  @IsOptional()
  MAX_LOGIN_ATTEMPTS: number = 5;

  @IsNumber()
  @Min(60)
  @Max(3600)
  @IsOptional()
  LOGIN_LOCKOUT_DURATION: number = 900; // 15 minutes

  // Performance & Scaling
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  MAX_CONCURRENT_REQUESTS: number = 50;

  @IsNumber()
  @Min(1000)
  @Max(60000)
  @IsOptional()
  REQUEST_TIMEOUT: number = 30000; // 30 seconds

  @IsBoolean()
  @IsOptional()
  ENABLE_COMPRESSION: boolean = true;

  // Communication Services (Optional)
  @IsString()
  @IsOptional()
  SMTP_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  SMTP_PORT: number;

  @IsString()
  @IsOptional()
  SMTP_USER: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD: string;

  @IsString()
  @IsOptional()
  TWILIO_ACCOUNT_SID: string;

  @IsString()
  @IsOptional()
  TWILIO_AUTH_TOKEN: string;

  @IsString()
  @IsOptional()
  TWILIO_PHONE_NUMBER: string;

  @IsString()
  @IsOptional()
  WHATSAPP_PHONE_NUMBER: string;

  // Application Metadata
  @IsString()
  @IsOptional()
  APP_NAME: string = 'SynergySwift';

  @IsString()
  @IsOptional()
  APP_VERSION: string = '3.0.0';

  @IsString()
  @IsOptional()
  APP_DESCRIPTION: string = 'Enterprise School Management System';
}

export function validateEnterpriseEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnterpriseEnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false, // Allow extra vars for flexibility
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = Object.values(error.constraints || {});
      return `  ❌ ${error.property}: ${constraints.join(', ')}`;
    });

    const errorReport = [
      '╔════════════════════════════════════════════════════════════╗',
      '║  ENTERPRISE ENVIRONMENT VALIDATION FAILED                  ║',
      '╠════════════════════════════════════════════════════════════╣',
      ...errorMessages,
      '╠════════════════════════════════════════════════════════════╣',
      '║  Please check your .env file and ensure all required       ║',
      '║  variables are set with valid values.                      ║',
      '╚════════════════════════════════════════════════════════════╝',
    ].join('\n');

    throw new Error(`\n${errorReport}\n`);
  }

  // Validate CORS origins format
  if (validatedConfig.CORS_ORIGIN && validatedConfig.CORS_ORIGIN !== '*') {
    const origins = validatedConfig.CORS_ORIGIN.split(',').map(o => o.trim());
    origins.forEach(origin => {
      if (origin !== 'http://localhost:3000' && origin !== 'http://localhost:5173') {
        try {
          new URL(origin);
        } catch (e) {
          throw new Error(
            `Invalid CORS_ORIGIN: "${origin}" is not a valid URL. ` +
            `Format: https://example.com,https://app.example.com or "*" for development only.`
          );
        }
      }
    });
  }

  // Security warnings for production
  if (validatedConfig.NODE_ENV === Environment.Production ||
      validatedConfig.NODE_ENV === Environment.Enterprise ||
      validatedConfig.NODE_ENV === Environment.RenderFree) {
    
    if (validatedConfig.CORS_ORIGIN === '*') {
      console.warn(
        '⚠️  WARNING: CORS_ORIGIN is set to "*" in production. ' +
        'This is insecure. Please specify allowed origins.'
      );
    }

    if (validatedConfig.JWT_SECRET.length < 128) {
      console.warn(
        '⚠️  WARNING: JWT_SECRET should be at least 128 characters for production use.'
      );
    }

    if (!validatedConfig.DATABASE_SSL) {
      console.warn(
        '⚠️  WARNING: DATABASE_SSL is disabled in production. ' +
        'This is insecure for remote databases.'
      );
    }
  }

  return validatedConfig;
}

import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  validateSync,
  Min,
  Max,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string = '*';

  @IsBoolean()
  @IsOptional()
  AUDIT_LOG_ENABLED?: boolean = true;

  @IsBoolean()
  @IsOptional()
  FEATURE_EMAIL_ENABLED?: boolean = false;

  @IsBoolean()
  @IsOptional()
  FEATURE_SMS_ENABLED?: boolean = false;

  @IsBoolean()
  @IsOptional()
  FEATURE_WHATSAPP_ENABLED?: boolean = false;

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string;

  @IsString()
  @IsOptional()
  TWILIO_ACCOUNT_SID?: string;

  @IsString()
  @IsOptional()
  TWILIO_AUTH_TOKEN?: string;

  @IsString()
  @IsOptional()
  TWILIO_PHONE_NUMBER?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_PROVIDER?: string = 'twilio';

  @IsString()
  @IsOptional()
  TWILIO_WHATSAPP_NUMBER?: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'log';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`❌ Configuration validation failed: ${errorMessages}`);
  }

  // Additional runtime checks
  if (!validatedConfig.DATABASE_URL) {
    throw new Error('❌ DATABASE_URL is required but not provided');
  }

  if (!validatedConfig.JWT_SECRET || validatedConfig.JWT_SECRET.length < 32) {
    throw new Error('❌ JWT_SECRET must be at least 32 characters long');
  }

  return validatedConfig;
}

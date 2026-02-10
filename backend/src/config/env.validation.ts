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
  RenderFree = 'render-free',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

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

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRATION: string = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRATION: string = '7d';

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = '*';

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  RATE_LIMIT_TTL: number = 60;

  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  RATE_LIMIT_MAX: number = 100;

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
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((error) => {
      const constraints = Object.values(error.constraints || {});
      return `${error.property}: ${constraints.join(', ')}`;
    });

    throw new Error(
      `Environment validation failed:\n${errorMessages.join('\n')}`
    );
  }

  return validatedConfig;
}

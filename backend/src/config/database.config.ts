import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');

  if (!databaseUrl) {
    throw new Error('❌ DATABASE_URL environment variable is required');
  }

  const isProduction = configService.get('NODE_ENV') === 'production';

  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: !isProduction,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    autoLoadEntities: true,
    extra: {
      max: 10,
      min: 2,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      statement_timeout: 30000,
    },
  };
};

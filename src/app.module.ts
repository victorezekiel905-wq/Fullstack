import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { validate } from './config/env.validation';
import dataSourceOptions from './config/data-source';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ResultsModule } from './modules/results/results.module';
import { FinanceModule } from './modules/finance/finance.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: [
        '.env.local',
        '.env.render-free',
        '.env.production',
        '.env.enterprise',
        '.env',
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get('RATE_LIMIT_TTL', 60) * 1000,
        limit: config.get('RATE_LIMIT_MAX', 100),
      }],
    }),
    HealthModule,
    AuthModule,
    TenantsModule,
    StudentsModule,
    TeachersModule,
    ResultsModule,
    FinanceModule,
    CommunicationModule,
    AuditModule,
  ],
})
export class AppModule {}

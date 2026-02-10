import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationController } from './communication.controller';
import { EmailService } from './services/email.service';
import { WhatsAppService } from './services/whatsapp.service';
import { SMSService } from './services/sms.service';
import { NotificationService } from './services/notification.service';
import { MessageTemplate } from './entities/message-template.entity';
import { MessageLog } from './entities/message-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MessageTemplate, MessageLog]),
  ],
  controllers: [CommunicationController],
  providers: [
    EmailService,
    WhatsAppService,
    SMSService,
    NotificationService,
  ],
  exports: [
    EmailService,
    WhatsAppService,
    SMSService,
    NotificationService,
  ],
})
export class CommunicationModule {}

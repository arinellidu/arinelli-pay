import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GATEWAY_URL, HTTP_TIMEOUT_MS } from '../common/gateway';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  imports: [
    HttpModule.register({ baseURL: GATEWAY_URL, timeout: HTTP_TIMEOUT_MS }),
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GATEWAY_URL, HTTP_TIMEOUT_MS } from '../common/gateway';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [
    HttpModule.register({ baseURL: GATEWAY_URL, timeout: HTTP_TIMEOUT_MS }),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}

import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GATEWAY_URL, HTTP_TIMEOUT_MS } from '../common/gateway';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  imports: [
    HttpModule.register({ baseURL: GATEWAY_URL, timeout: HTTP_TIMEOUT_MS }),
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
})
export class ContractsModule {}

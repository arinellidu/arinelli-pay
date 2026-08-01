import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GATEWAY_URL, HTTP_TIMEOUT_MS } from '../common/gateway';
import { ChargesController } from './charges.controller';
import { ChargesService } from './charges.service';

@Module({
  imports: [
    HttpModule.register({ baseURL: GATEWAY_URL, timeout: HTTP_TIMEOUT_MS }),
  ],
  controllers: [ChargesController],
  providers: [ChargesService],
})
export class ChargesModule {}

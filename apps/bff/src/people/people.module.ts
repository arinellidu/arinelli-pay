import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { GATEWAY_URL, HTTP_TIMEOUT_MS } from '../common/gateway';
import { PeopleController } from './people.controller';
import { PeopleService } from './people.service';

@Module({
  imports: [
    HttpModule.register({ baseURL: GATEWAY_URL, timeout: HTTP_TIMEOUT_MS }),
  ],
  controllers: [PeopleController],
  providers: [PeopleService],
})
export class PeopleModule {}

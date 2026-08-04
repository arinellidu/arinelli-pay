import { Module } from '@nestjs/common';
import { PeopleController } from './people.controller';
import { PeopleStore } from './people.store';

@Module({
  controllers: [PeopleController],
  providers: [PeopleStore],
})
export class PeopleModule {}

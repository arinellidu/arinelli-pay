import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60_000)
  list() {
    return this.service.list();
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60_000)
  byId(@Param('id') id: string) {
    return this.service.byId(id);
  }

  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateClientDto) {
    return this.service.update(id, dto);
  }
}

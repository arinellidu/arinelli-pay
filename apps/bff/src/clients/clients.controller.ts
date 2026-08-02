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

/**
 * Leitura da carteira é cacheada por poucos segundos, não por minuto: um
 * cliente recém-cadastrado precisa aparecer no filtro da tela quase na hora.
 * 60s deixava o front mostrando o id cru no lugar do nome (o select resolve o
 * rótulo pela lista) por até um minuto depois do POST.
 */
const CACHE_TTL_MS = 5_000;

@Controller('clients')
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_TTL_MS)
  list() {
    return this.service.list();
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_TTL_MS)
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

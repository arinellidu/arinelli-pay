import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  /** TTL curto de verdade: a lista alimenta o loop cobrar→PAGA — 60s aqui
      segurava a etiqueta do card por até um minuto depois da liquidação. */
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(5_000)
  search(@Query() query: Record<string, string>) {
    return this.service.search(query);
  }

  /** Sem cache: é o polling que vira o badge PAID em <5s (P07). */
  @Get(':id/status')
  status(@Param('id') id: string) {
    return this.service.status(id);
  }
}

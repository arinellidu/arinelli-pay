import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';

/**
 * Mesma janela curta de clients/invoices: gerar a próxima fatura muda o
 * `nextDueDate` do contrato, e a tela de detalhe precisa refletir isso no
 * refresh seguinte — não um minuto depois.
 */
const CACHE_TTL_MS = 5_000;

@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_TTL_MS)
  list(@Query('clientId') clientId?: string) {
    return this.service.list(clientId);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_TTL_MS)
  byId(@Param('id') id: string) {
    return this.service.byId(id);
  }

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  /**
   * I1: a chave vem do front e é repassada intacta — o BFF nunca inventa uma.
   * O status também passa fiel: 201 gerou, 200 é replay da mesma intenção.
   */
  @Post(':id/invoices\\:generate-next')
  async generateNext(
    @Param('id') id: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res() res: Response,
  ) {
    const { status, body } = await this.service.generateNextInvoice(
      id,
      idempotencyKey,
    );
    res.status(status).json(body);
  }
}

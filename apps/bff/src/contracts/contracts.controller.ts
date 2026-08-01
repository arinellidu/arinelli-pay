import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60_000)
  list(@Query('clientId') clientId?: string) {
    return this.service.list(clientId);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60_000)
  byId(@Param('id') id: string) {
    return this.service.byId(id);
  }

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.service.create(dto);
  }

  @Post(':id/invoices\\:generate-next')
  generateNext(@Param('id') id: string) {
    return this.service.generateNextInvoice(id);
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';

@Controller('charges')
export class ChargesController {
  constructor(private readonly service: ChargesService) {}

  /** Repassa 201 (criado) ou 200 (replay) exatamente como o core respondeu. */
  @Post()
  async create(
    @Body() dto: CreateChargeDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res() res: Response,
  ) {
    const { status, body } = await this.service.create(dto, idempotencyKey);
    res.status(status).json(body);
  }

  @Get(':id')
  byId(@Param('id') id: string) {
    return this.service.byId(id);
  }
}

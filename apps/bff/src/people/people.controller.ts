import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import type { PessoaFisicaPayload, PessoaJuridicaPayload } from './people-schema';
import { pessoaFisicaSchema, pessoaJuridicaSchema } from './people-schema';
import { PeopleService } from './people.service';
import { ZodBody } from './zod-body.pipe';

/**
 * Cadastro de pessoas: valida com o schema zod ESPELHADO do formulário
 * (people-schema.ts) e repassa ao billing-core, que renormaliza e é a
 * autoridade (unique de documento, FK do responsável). Sem cache de leitura:
 * o refresh imediato pós-cadastro é o momento da tela.
 */
@Controller('people')
export class PeopleController {
  constructor(private readonly service: PeopleService) {}

  @Get('pf')
  listFisicas() {
    return this.service.listFisicas();
  }

  @Post('pf')
  createFisica(
    @Body(new ZodBody(pessoaFisicaSchema)) payload: PessoaFisicaPayload,
  ) {
    return this.service.createFisica(payload);
  }

  @Put('pf/:id')
  updateFisica(
    @Param('id') id: string,
    @Body(new ZodBody(pessoaFisicaSchema)) payload: PessoaFisicaPayload,
  ) {
    return this.service.updateFisica(Number(id), payload);
  }

  @Get('pj')
  listJuridicas() {
    return this.service.listJuridicas();
  }

  @Post('pj')
  createJuridica(
    @Body(new ZodBody(pessoaJuridicaSchema)) payload: PessoaJuridicaPayload,
  ) {
    return this.service.createJuridica(payload);
  }

  @Put('pj/:id')
  updateJuridica(
    @Param('id') id: string,
    @Body(new ZodBody(pessoaJuridicaSchema)) payload: PessoaJuridicaPayload,
  ) {
    return this.service.updateJuridica(Number(id), payload);
  }
}

import { Body, Controller, Get, Post } from '@nestjs/common';
import type { PessoaFisicaPayload, PessoaJuridicaPayload } from './people-schema';
import { pessoaFisicaSchema, pessoaJuridicaSchema } from './people-schema';
import { PeopleStore } from './people.store';
import { ZodBody } from './zod-body.pipe';

/**
 * Cadastro mock de pessoas (memória do BFF). Sem cache de leitura de
 * propósito: quem acabou de cadastrar precisa se ver na lista no refresh
 * seguinte, e a lista já mora no mesmo processo.
 */
@Controller('people')
export class PeopleController {
  constructor(private readonly store: PeopleStore) {}

  @Get('pf')
  listFisicas() {
    return this.store.listFisicas();
  }

  @Post('pf')
  createFisica(
    @Body(new ZodBody(pessoaFisicaSchema)) payload: PessoaFisicaPayload,
  ) {
    return this.store.addFisica(payload);
  }

  @Get('pj')
  listJuridicas() {
    return this.store.listJuridicas();
  }

  @Post('pj')
  createJuridica(
    @Body(new ZodBody(pessoaJuridicaSchema)) payload: PessoaJuridicaPayload,
  ) {
    return this.store.addJuridica(payload);
  }
}

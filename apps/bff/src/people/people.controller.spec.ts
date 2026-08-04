import { BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { pessoaFisicaSchema, pessoaJuridicaSchema } from './people-schema';
import { PeopleController } from './people.controller';
import { PeopleStore } from './people.store';
import { ZodBody } from './zod-body.pipe';

describe('PeopleController (store em memória)', () => {
  let controller: PeopleController;
  let store: PeopleStore;

  beforeEach(() => {
    store = new PeopleStore();
    controller = new PeopleController(store);
  });

  it('nasce com a carteira sintética: 4 PF e 2 PJ com responsável resolvido', () => {
    expect(controller.listFisicas()).toHaveLength(4);
    const juridicas = controller.listJuridicas();
    expect(juridicas).toHaveLength(2);
    const aurora = juridicas.find((pj) => pj.cnpj === '11222333000181');
    expect(aurora?.responsavel.nome).toBe('Helena Prado Martins');
    expect(aurora?.responsavel.cpf).toBe('52998224725');
  });

  it('cadastra PF mínima e ela aparece no topo da lista', () => {
    const criada = controller.createFisica(
      pessoaFisicaSchema.parse({ nome: 'Ana Souza', cpf: '287.244.093-32' }),
    );
    expect(criada.id).toBeGreaterThan(4);
    expect(controller.listFisicas()[0].nome).toBe('Ana Souza');
  });

  it('CPF repetido morre com 409 apontando o campo', () => {
    const payload = pessoaFisicaSchema.parse({ nome: 'Helena Clone', cpf: '52998224725' });
    expect(() => controller.createFisica(payload)).toThrow(ConflictException);
    try {
      controller.createFisica(payload);
    } catch (e) {
      const body = (e as ConflictException).getResponse() as { fieldErrors: Record<string, string[]> };
      expect(body.fieldErrors.cpf).toEqual(['CPF já cadastrado']);
    }
  });

  it('PJ nova atrelada a PF existente entra com responsável resolvido', () => {
    const criada = controller.createJuridica(
      pessoaJuridicaSchema.parse({
        razaoSocial: 'Sarmento Consultoria LTDA',
        cnpj: '48.560.263/0001-81',
        emailContato: 'oi@sarmento.com.br',
        telefoneContato: '31984120977',
        responsavelId: '3',
      }),
    );
    expect(criada.responsavel.nome).toBe('Beatriz Sarmento Duarte');
    expect(controller.listJuridicas()[0].razaoSocial).toBe('Sarmento Consultoria LTDA');
  });

  it('PJ com responsável inexistente morre com 422 apontando o campo', () => {
    const payload = pessoaJuridicaSchema.parse({
      razaoSocial: 'Fantasma LTDA',
      cnpj: '48.560.263/0001-81',
      emailContato: 'x@y.com.br',
      telefoneContato: '1130074521',
      responsavelId: '999',
    });
    expect(() => controller.createJuridica(payload)).toThrow(UnprocessableEntityException);
  });

  it('CNPJ repetido morre com 409', () => {
    const payload = pessoaJuridicaSchema.parse({
      razaoSocial: 'Aurora Clone LTDA',
      cnpj: '11222333000181',
      emailContato: 'x@y.com.br',
      telefoneContato: '1130074521',
      responsavelId: '1',
    });
    expect(() => controller.createJuridica(payload)).toThrow(ConflictException);
  });
});

describe('ZodBody (o 400 que o formulário consome)', () => {
  it('reprova com { message, fieldErrors } por campo', () => {
    const pipe = new ZodBody(pessoaFisicaSchema);
    let lancado: unknown;
    try {
      pipe.transform({ nome: 'X', cpf: '123' });
    } catch (e) {
      lancado = e;
    }
    expect(lancado).toBeInstanceOf(BadRequestException);
    const body = (lancado as BadRequestException).getResponse() as {
      message: string;
      fieldErrors: Record<string, string[]>;
    };
    expect(body.message).toBe('Validação falhou');
    expect(body.fieldErrors.nome).toBeDefined();
    expect(body.fieldErrors.cpf).toBeDefined();
  });

  it('deixa passar payload válido já transformado', () => {
    const pipe = new ZodBody(pessoaFisicaSchema);
    const parsed = pipe.transform({ nome: 'Ana Souza', cpf: '529.982.247-25' });
    expect(parsed.cpf).toBe('52998224725');
  });
});

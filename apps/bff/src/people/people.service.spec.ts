import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { pessoaFisicaSchema, pessoaJuridicaSchema } from './people-schema';
import { PeopleService } from './people.service';
import { ZodBody } from './zod-body.pipe';

const upstreamError = (status: number, detail: string) =>
  new AxiosError('upstream', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    data: { title: 'x', detail, status },
  } as AxiosResponse);

const pfPayload = pessoaFisicaSchema.parse({ nome: 'Ana Souza', cpf: '287.244.093-32' });
const pjPayload = pessoaJuridicaSchema.parse({
  razaoSocial: 'Aurora Design LTDA',
  cnpj: '11.222.333/0001-81',
  emailContato: 'contato@aurora.com.br',
  telefoneContato: '1130074521',
  responsavelId: '1',
});

describe('PeopleService (proxy fino: só traduz forma de erro)', () => {
  let http: { get: jest.Mock; post: jest.Mock };
  let service: PeopleService;

  beforeEach(() => {
    http = { get: jest.fn(), post: jest.fn() };
    service = new PeopleService(http as unknown as HttpService);
  });

  it('lista PF repassando o corpo do core', async () => {
    http.get.mockReturnValue(of({ data: [{ id: 1, nome: 'Helena' }] }));
    await expect(service.listFisicas()).resolves.toEqual([{ id: 1, nome: 'Helena' }]);
    expect(http.get).toHaveBeenCalledWith('/api/billing/people/pf');
  });

  it('cria PF repassando o payload validado', async () => {
    http.post.mockReturnValue(of({ data: { id: 9, nome: 'Ana Souza' } }));
    await expect(service.createFisica(pfPayload)).resolves.toEqual({ id: 9, nome: 'Ana Souza' });
    expect(http.post).toHaveBeenCalledWith('/api/billing/people/pf', pfPayload);
  });

  it('409 do core vira ConflictException com fieldErrors.cpf', async () => {
    http.post.mockReturnValue(throwError(() => upstreamError(409, 'documento duplicado: 28724409332')));
    const promise = service.createFisica(pfPayload);
    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    await promise.catch((e: ConflictException) => {
      const body = e.getResponse() as { fieldErrors: Record<string, string[]> };
      expect(body.fieldErrors.cpf).toEqual(['CPF já cadastrado']);
    });
  });

  it('409 de CNPJ cai no campo cnpj', async () => {
    http.post.mockReturnValue(throwError(() => upstreamError(409, 'documento duplicado')));
    await service.createJuridica(pjPayload).catch((e: ConflictException) => {
      const body = e.getResponse() as { fieldErrors: Record<string, string[]> };
      expect(body.fieldErrors.cnpj).toEqual(['CNPJ já cadastrado']);
    });
  });

  it('422 do core vira UnprocessableEntityException apontando responsavelId', async () => {
    http.post.mockReturnValue(
      throwError(() => upstreamError(422, 'Pessoa física responsável não encontrada: 999')),
    );
    const promise = service.createJuridica(pjPayload);
    await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
    await promise.catch((e: UnprocessableEntityException) => {
      const body = e.getResponse() as { fieldErrors: Record<string, string[]> };
      expect(body.fieldErrors.responsavelId).toEqual([
        'Pessoa física não encontrada — cadastre-a primeiro',
      ]);
    });
  });

  it('qualquer outro upstream passa intacto (rethrowUpstream, ADR-003)', async () => {
    http.post.mockReturnValue(throwError(() => upstreamError(500, 'quebrou')));
    const promise = service.createFisica(pfPayload);
    await expect(promise).rejects.toBeInstanceOf(HttpException);
    await promise.catch((e: HttpException) => {
      expect(e.getStatus()).toBe(500);
    });
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

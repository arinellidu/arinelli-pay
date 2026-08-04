import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PessoaFisica,
  PessoaFisicaPayload,
  PessoaJuridica,
  PessoaJuridicaPayload,
} from './people-schema';

/** PJ guarda só a referência; o GET resolve o responsável na hora. */
type PessoaJuridicaRow = Omit<PessoaJuridica, 'responsavel'> & {
  responsavelId: number;
};

/**
 * MOCK do cadastro de pessoas: vive na memória do processo e zera no restart.
 * Existe para a tela PF/PJ rodar ponta a ponta (form → validação → 201/409 →
 * lista) antes de o cadastro real entrar no billing-core. As regras espelham o
 * core: documento único (409, como o unique de clients no P01) e PJ sempre
 * atrelada a uma PF já cadastrada como responsável legal.
 */
@Injectable()
export class PeopleStore {
  private readonly fisicas = new Map<number, PessoaFisica>();
  private readonly juridicas = new Map<number, PessoaJuridicaRow>();
  private pfSeq = 1;
  private pjSeq = 1;

  constructor() {
    this.seed();
  }

  listFisicas(): PessoaFisica[] {
    return [...this.fisicas.values()].sort(byMaisRecente);
  }

  addFisica(payload: PessoaFisicaPayload): PessoaFisica {
    const duplicada = [...this.fisicas.values()].some(
      (pessoa) => pessoa.cpf === payload.cpf,
    );
    if (duplicada) {
      throw new ConflictException({
        message: 'CPF já cadastrado',
        fieldErrors: { cpf: ['CPF já cadastrado'] },
      });
    }
    const pessoa: PessoaFisica = {
      id: this.pfSeq++,
      ...payload,
      criadoEm: new Date().toISOString(),
    };
    this.fisicas.set(pessoa.id, pessoa);
    return pessoa;
  }

  listJuridicas(): PessoaJuridica[] {
    return [...this.juridicas.values()].sort(byMaisRecente).map((row) => this.comResponsavel(row));
  }

  addJuridica(payload: PessoaJuridicaPayload): PessoaJuridica {
    const duplicada = [...this.juridicas.values()].some(
      (empresa) => empresa.cnpj === payload.cnpj,
    );
    if (duplicada) {
      throw new ConflictException({
        message: 'CNPJ já cadastrado',
        fieldErrors: { cnpj: ['CNPJ já cadastrado'] },
      });
    }
    if (!this.fisicas.has(payload.responsavelId)) {
      // schema não alcança esta regra: existência é estado do cadastro, não formato
      throw new UnprocessableEntityException({
        message: 'Responsável legal não encontrado',
        fieldErrors: {
          responsavelId: ['Pessoa física não encontrada — cadastre-a primeiro'],
        },
      });
    }
    const empresa: PessoaJuridicaRow = {
      id: this.pjSeq++,
      ...payload,
      criadoEm: new Date().toISOString(),
    };
    this.juridicas.set(empresa.id, empresa);
    return this.comResponsavel(empresa);
  }

  private comResponsavel(row: PessoaJuridicaRow): PessoaJuridica {
    const { responsavelId, ...empresa } = row;
    const pf = this.fisicas.get(responsavelId);
    return {
      ...empresa,
      responsavel: pf
        ? { id: pf.id, nome: pf.nome, cpf: pf.cpf }
        : { id: responsavelId, nome: '(removida)', cpf: '' },
    };
  }

  /** Carteira sintética: dados verossímeis, todos com documento válido por dígito. */
  private seed(): void {
    const fisicas: Array<Omit<PessoaFisica, 'id'>> = [
      {
        nome: 'Helena Prado Martins',
        cpf: '52998224725',
        email: 'helena.prado@exemplo.com.br',
        telefone: '11987650142',
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        numero: '1578',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
        criadoEm: '2026-07-21T13:40:00.000Z',
      },
      {
        nome: 'Rafael Nogueira Lima',
        cpf: '11144477735',
        email: 'rafael.nogueira@exemplo.com.br',
        telefone: '21996428307',
        cep: '20040020',
        logradouro: 'Rua da Assembleia',
        numero: '10',
        complemento: 'Sala 2214',
        bairro: 'Centro',
        cidade: 'Rio de Janeiro',
        uf: 'RJ',
        criadoEm: '2026-07-24T10:05:00.000Z',
      },
      {
        nome: 'Beatriz Sarmento Duarte',
        cpf: '93541134780',
        telefone: '31984120977',
        cidade: 'Belo Horizonte',
        uf: 'MG',
        criadoEm: '2026-07-29T18:22:00.000Z',
      },
      {
        // só os obrigatórios primários + e-mail: o cadastro mínimo também é real
        nome: 'Caio Ferraz Albuquerque',
        cpf: '15350946056',
        email: 'caio.ferraz@exemplo.com.br',
        criadoEm: '2026-08-01T09:15:00.000Z',
      },
    ];
    for (const pessoa of fisicas) {
      this.fisicas.set(this.pfSeq, { id: this.pfSeq, ...pessoa });
      this.pfSeq++;
    }

    const juridicas: Array<Omit<PessoaJuridicaRow, 'id'>> = [
      {
        razaoSocial: 'Estúdio Aurora Design LTDA',
        nomeFantasia: 'Aurora Studio',
        cnpj: '11222333000181',
        emailContato: 'contato@auroradesign.com.br',
        telefoneContato: '1130074521',
        responsavelId: 1,
        cep: '01310100',
        logradouro: 'Avenida Paulista',
        numero: '1578',
        complemento: 'Conj. 904',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        uf: 'SP',
        criadoEm: '2026-07-22T11:00:00.000Z',
      },
      {
        razaoSocial: 'Nogueira & Filhos Serviços ME',
        cnpj: '11444777000161',
        emailContato: 'financeiro@nogueirafilhos.com.br',
        telefoneContato: '2125077700',
        responsavelId: 2,
        cidade: 'Rio de Janeiro',
        uf: 'RJ',
        criadoEm: '2026-07-26T16:30:00.000Z',
      },
    ];
    for (const empresa of juridicas) {
      this.juridicas.set(this.pjSeq, { id: this.pjSeq, ...empresa });
      this.pjSeq++;
    }
  }
}

function byMaisRecente(a: { criadoEm: string; id: number }, b: { criadoEm: string; id: number }): number {
  return b.criadoEm.localeCompare(a.criadoEm) || b.id - a.id;
}

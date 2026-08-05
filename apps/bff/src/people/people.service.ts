import { HttpService } from '@nestjs/axios';
import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { rethrowUpstream } from '../common/gateway';
import type { PessoaFisicaPayload, PessoaJuridicaPayload } from './people-schema';

/**
 * Proxy fino para o cadastro de pessoas do billing-core (gateway na frente).
 * A única tradução que acontece aqui é de FORMA, não de negócio: o ProblemDetail
 * de 409/422 do core vira o { fieldErrors } que o formulário consome via
 * setError — a mensagem cai no campo certo (cpf, cnpj ou responsavelId).
 */
@Injectable()
export class PeopleService {
  constructor(private readonly http: HttpService) {}

  async listFisicas(): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>('/api/billing/people/pf'),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async createFisica(payload: PessoaFisicaPayload): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>('/api/billing/people/pf', payload),
      );
      return data;
    } catch (e) {
      this.rethrowForField(e, 'cpf', 'CPF já cadastrado');
    }
  }

  async updateFisica(id: number, payload: PessoaFisicaPayload): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.put<unknown>(`/api/billing/people/pf/${id}`, payload),
      );
      return data;
    } catch (e) {
      this.rethrowForField(e, 'cpf', 'CPF já cadastrado');
    }
  }

  async listJuridicas(): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>('/api/billing/people/pj'),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async createJuridica(payload: PessoaJuridicaPayload): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>('/api/billing/people/pj', payload),
      );
      return data;
    } catch (e) {
      this.rethrowForField(e, 'cnpj', 'CNPJ já cadastrado');
    }
  }

  async updateJuridica(id: number, payload: PessoaJuridicaPayload): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.put<unknown>(`/api/billing/people/pj/${id}`, payload),
      );
      return data;
    } catch (e) {
      this.rethrowForField(e, 'cnpj', 'CNPJ já cadastrado');
    }
  }

  private rethrowForField(error: unknown, documento: string, duplicado: string): never {
    if (error instanceof AxiosError && error.response) {
      const detail = (error.response.data as { detail?: string } | null)?.detail;
      if (error.response.status === 409) {
        throw new ConflictException({
          message: detail ?? duplicado,
          fieldErrors: { [documento]: [duplicado] },
        });
      }
      if (error.response.status === 422) {
        throw new UnprocessableEntityException({
          message: detail ?? 'Responsável legal não encontrado',
          fieldErrors: {
            responsavelId: ['Pessoa física não encontrada — cadastre-a primeiro'],
          },
        });
      }
    }
    rethrowUpstream(error);
  }
}

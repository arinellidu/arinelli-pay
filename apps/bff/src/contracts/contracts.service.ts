import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { rethrowUpstream } from '../common/gateway';
import { CreateContractDto } from './dto/create-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly http: HttpService) {}

  async list(clientId?: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>('/api/billing/contracts', {
          params: clientId ? { clientId } : {},
        }),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async byId(id: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(`/api/billing/contracts/${id}`),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async create(dto: CreateContractDto): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>('/api/billing/contracts', dto),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  /** GeraÃ§Ã£o explÃ­cita da prÃ³xima fatura â€” regra vive no core (ADR-003). */
  async generateNextInvoice(
    id: string,
    idempotencyKey: string | undefined,
  ): Promise<{ status: number; body: unknown }> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(
          `/api/billing/contracts/${id}/invoices:generate-next`,
          undefined,
          {
            headers: idempotencyKey
              ? { 'Idempotency-Key': idempotencyKey }
              : {},
          },
        ),
      );
      // 201 (gerou) ou 200 (replay) exatamente como o core respondeu
      return { status: response.status, body: response.data };
    } catch (e) {
      rethrowUpstream(e);
    }
  }
}

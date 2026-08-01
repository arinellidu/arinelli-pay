import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { rethrowUpstream } from '../common/gateway';
import { CreateChargeDto } from './dto/create-charge.dto';

@Injectable()
export class ChargesService {
  constructor(private readonly http: HttpService) {}

  /**
   * I1: a Idempotency-Key vem do FRONT e Ã© repassada intacta â€” o BFF nunca
   * inventa uma. Sem key, o gateway responde 400 e o erro passa fiel.
   */
  async create(
    dto: CreateChargeDto,
    idempotencyKey: string | undefined,
  ): Promise<{ status: number; body: unknown }> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>('/api/payments/charges', dto, {
          headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
        }),
      );
      return { status: response.status, body: response.data };
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async byId(id: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(`/api/payments/charges/${id}`),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }
}

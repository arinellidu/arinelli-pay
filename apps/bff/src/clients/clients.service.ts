import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { rethrowUpstream } from '../common/gateway';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly http: HttpService) {}

  async list(): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>('/api/billing/clients'),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async byId(id: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(`/api/billing/clients/${id}`),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async create(dto: CreateClientDto): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.post<unknown>('/api/billing/clients', dto),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  async update(id: string, dto: CreateClientDto): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.put<unknown>(`/api/billing/clients/${id}`, dto),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }
}

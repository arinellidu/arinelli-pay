import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { rethrowUpstream } from '../common/gateway';

/** Fatura como o core devolve (P02): cliente e contrato jÃ¡ vÃªm embutidos. */
interface CoreInvoice {
  id: number;
  contractId: number;
  contractTitle: string;
  clientId: number;
  clientName: string;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

interface CorePage {
  content: CoreInvoice[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}

interface CoreCharge {
  id: number;
  invoiceId: number;
  rail: string;
  provider: string;
  providerRef: string | null;
  status: string;
  emv: string | null;
  createdAt: string;
  settledAt: string | null;
}

/** Item pronto para card E tabela: uma chamada, zero join no front. */
export interface BffInvoice {
  id: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  client: { id: number; name: string };
  contract: { id: number; title: string };
  charge: {
    id: number;
    rail: string;
    status: string;
    emv: string | null;
    providerRef: string | null;
  } | null;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly http: HttpService) {}

  /**
   * AgregaÃ§Ã£o pura (ADR-003): pÃ¡gina de faturas do billing + Ãºltima charge de
   * cada uma no payments. Nenhuma decisÃ£o de status acontece aqui.
   */
  async search(
    query: Record<string, string>,
  ): Promise<{ content: BffInvoice[]; page: CorePage['page'] }> {
    try {
      const { data: pageData } = await firstValueFrom(
        this.http.get<CorePage>('/api/billing/invoices', { params: query }),
      );

      const content = await Promise.all(
        pageData.content.map(async (invoice) => {
          const { data: charges } = await firstValueFrom(
            this.http.get<CoreCharge[]>(
              `/api/payments/invoices/${invoice.id}/charges`,
            ),
          );
          const latest =
            charges.length > 0 ? charges[charges.length - 1] : null;
          return this.toBffInvoice(invoice, latest);
        }),
      );

      return { content, page: pageData.page };
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  /** Polling do front (P07): passthrough do estado consolidado â€” NUNCA cacheado. */
  async status(id: string): Promise<unknown> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<unknown>(`/api/payments/invoices/${id}/status`),
      );
      return data;
    } catch (e) {
      rethrowUpstream(e);
    }
  }

  private toBffInvoice(
    invoice: CoreInvoice,
    charge: CoreCharge | null,
  ): BffInvoice {
    return {
      id: invoice.id,
      amount: invoice.amount,
      dueDate: invoice.dueDate,
      status: invoice.status,
      paidAt: invoice.paidAt,
      createdAt: invoice.createdAt,
      client: { id: invoice.clientId, name: invoice.clientName },
      contract: { id: invoice.contractId, title: invoice.contractTitle },
      charge: charge && {
        id: charge.id,
        rail: charge.rail,
        status: charge.status,
        emv: charge.emv,
        providerRef: charge.providerRef,
      },
    };
  }
}

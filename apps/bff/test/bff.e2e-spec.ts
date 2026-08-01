import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as http from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/** Gateway mockado: registra chamadas e devolve fixtures do shape real do core. */
class FakeGateway {
  server!: http.Server;
  counters: Record<string, number> = {};
  lastIdempotencyKey: string | null | undefined;

  private bump(key: string) {
    this.counters[key] = (this.counters[key] ?? 0) + 1;
  }

  start(port: number): Promise<void> {
    this.server = http.createServer((req, res) => {
      const url = req.url ?? '';
      const send = (status: number, body: unknown) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };

      if (url.startsWith('/api/billing/clients')) {
        this.bump('clients');
        return send(200, [
          {
            id: 1,
            document: '52998224725',
            documentType: 'CPF',
            name: 'Maria',
            email: null,
          },
        ]);
      }
      if (url.startsWith('/api/billing/invoices')) {
        this.bump('invoices');
        return send(200, {
          content: [
            {
              id: 1,
              contractId: 10,
              contractTitle: 'Mensalidade',
              clientId: 5,
              clientName: 'Maria',
              amount: 250.0,
              dueDate: '2026-08-28',
              status: 'OPEN',
              paidAt: null,
              createdAt: '2026-08-01T12:00:00Z',
            },
            {
              id: 2,
              contractId: 10,
              contractTitle: 'Mensalidade',
              clientId: 5,
              clientName: 'Maria',
              amount: 250.0,
              dueDate: '2026-09-28',
              status: 'OPEN',
              paidAt: null,
              createdAt: '2026-08-01T12:00:00Z',
            },
          ],
          page: { size: 20, number: 0, totalElements: 2, totalPages: 1 },
        });
      }
      if (url === '/api/payments/invoices/1/charges') {
        this.bump('charges-of-1');
        return send(200, [
          {
            id: 77,
            invoiceId: 1,
            rail: 'PIX',
            provider: 'fake',
            providerRef: 'ARINPAY0001',
            status: 'PENDING',
            emv: '000201...6304ABCD',
            createdAt: '2026-08-01T12:01:00Z',
            settledAt: null,
          },
        ]);
      }
      if (url === '/api/payments/invoices/2/charges') {
        return send(200, []);
      }
      if (url === '/api/payments/invoices/1/status') {
        this.bump('status-1');
        return send(200, {
          invoiceId: 1,
          status: 'OPEN',
          paidAt: null,
          charge: { rail: 'PIX', status: 'PENDING' },
          poll: this.counters['status-1'],
        });
      }
      if (url === '/api/payments/charges' && req.method === 'POST') {
        this.bump('post-charges');
        this.lastIdempotencyKey = req.headers['idempotency-key'] as
          string | undefined;
        if (!this.lastIdempotencyKey) {
          return send(400, {
            title: 'Header obrigatório ausente',
            status: 400,
          });
        }
        return send(201, {
          id: 99,
          invoiceId: 1,
          rail: 'PIX',
          status: 'PENDING',
          emv: '000201...',
        });
      }
      if (
        /^\/api\/billing\/contracts\/1\/invoices:generate-next$/.test(url) &&
        req.method === 'POST'
      ) {
        this.bump('generate-next');
        return send(201, { id: 3, status: 'OPEN', dueDate: '2026-10-28' });
      }
      return send(404, { title: 'rota fake não mapeada', url });
    });
    return new Promise((resolve) =>
      this.server.listen(port, '127.0.0.1', () => resolve()),
    );
  }

  stop(): Promise<void> {
    return new Promise((resolve) => this.server.close(() => resolve()));
  }
}

describe('BFF (e2e, gateway mockado)', () => {
  let app: INestApplication;
  const fake = new FakeGateway();

  beforeAll(async () => {
    await fake.start(18090);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('bff');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/bff/invoices agrega cliente, contrato e charge em uma chamada', async () => {
    const response = await request(app.getHttpServer())
      .get('/bff/invoices')
      .expect(200);

    const [first, second] = response.body.content;
    expect(first.client).toEqual({ id: 5, name: 'Maria' });
    expect(first.contract).toEqual({ id: 10, title: 'Mensalidade' });
    expect(first.charge).toMatchObject({
      id: 77,
      rail: 'PIX',
      status: 'PENDING',
      emv: '000201...6304ABCD',
    });
    expect(second.charge).toBeNull();
    expect(response.body.page.totalElements).toBe(2);
  });

  it('leituras têm cache de 60s (segunda chamada não bate no gateway)', async () => {
    const before = fake.counters['clients'] ?? 0;
    await request(app.getHttpServer()).get('/bff/clients').expect(200);
    await request(app.getHttpServer()).get('/bff/clients').expect(200);
    expect(fake.counters['clients']).toBe(before + 1);
  });

  it('polling de status NUNCA é cacheado', async () => {
    const r1 = await request(app.getHttpServer())
      .get('/bff/invoices/1/status')
      .expect(200);
    const r2 = await request(app.getHttpServer())
      .get('/bff/invoices/1/status')
      .expect(200);
    expect(r2.body.poll).toBe(r1.body.poll + 1); // cada GET bateu no gateway
  });

  it('POST /bff/charges repassa a Idempotency-Key do front intacta', async () => {
    await request(app.getHttpServer())
      .post('/bff/charges')
      .set('Idempotency-Key', 'front-key-123')
      .send({ invoiceId: 1, rail: 'PIX' })
      .expect(201);
    expect(fake.lastIdempotencyKey).toBe('front-key-123');
  });

  it('POST /bff/charges sem key propaga o 400 do gateway (nunca gera key própria)', async () => {
    const response = await request(app.getHttpServer())
      .post('/bff/charges')
      .send({ invoiceId: 1, rail: 'PIX' })
      .expect(400);
    expect(fake.lastIdempotencyKey).toBeUndefined();
    expect(response.body.title).toBe('Header obrigatório ausente');
  });

  it('body inválido morre na validação local sem tocar o gateway', async () => {
    const before = fake.counters['post-charges'] ?? 0;
    await request(app.getHttpServer())
      .post('/bff/charges')
      .set('Idempotency-Key', 'k')
      .send({ invoiceId: 1, rail: 'XPTO' })
      .expect(400);
    expect(fake.counters['post-charges'] ?? 0).toBe(before);
  });

  it('POST /bff/contracts/:id/invoices:generate-next roteia (escape de ":" ok)', async () => {
    await request(app.getHttpServer())
      .post('/bff/contracts/1/invoices:generate-next')
      .expect(201);
    expect(fake.counters['generate-next']).toBe(1);
  });

  it('gateway fora do ar vira 502 em rota não cacheada', async () => {
    await fake.stop();
    const response = await request(app.getHttpServer())
      .get('/bff/charges/123')
      .expect(502);
    expect(response.body.title).toBe('Gateway indisponível');
  });
});

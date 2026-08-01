import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ChargesModule } from './charges/charges.module';
import { ClientsModule } from './clients/clients.module';
import { ContractsModule } from './contracts/contracts.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    // cache curto de leitura (60s) — aplicado handler a handler, nunca no polling
    CacheModule.register({ isGlobal: true, ttl: 60_000 }),
    ClientsModule,
    ContractsModule,
    InvoicesModule,
    ChargesModule,
  ],
})
export class AppModule {}

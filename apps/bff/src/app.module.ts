import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ChargesModule } from './charges/charges.module';
import { ClientsModule } from './clients/clients.module';
import { ContractsModule } from './contracts/contracts.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PeopleModule } from './people/people.module';

@Module({
  imports: [
    // Cache de leitura aplicado handler a handler, nunca no polling.
    // O default é 5s de propósito: o teto de defasagem da tela é este TTL (o
    // front já roda force-dynamic + no-store), e num produto que promete
    // refletir evento real em segundos, esquecer um @CacheTTL tem que falhar
    // para o lado fresco. Leitura pesada que mereça cache longo declara o valor
    // explicitamente — essa é a decisão que merece estar escrita.
    CacheModule.register({ isGlobal: true, ttl: 5_000 }),
    ClientsModule,
    ContractsModule,
    InvoicesModule,
    ChargesModule,
    PeopleModule,
  ],
})
export class AppModule {}

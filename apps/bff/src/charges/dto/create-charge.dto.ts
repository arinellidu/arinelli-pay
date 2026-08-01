import { IsIn, IsInt, IsPositive } from 'class-validator';

export class CreateChargeDto {
  @IsInt()
  @IsPositive()
  invoiceId!: number;

  @IsIn(['PIX', 'BOLETO', 'CARD'])
  rail!: string;
}

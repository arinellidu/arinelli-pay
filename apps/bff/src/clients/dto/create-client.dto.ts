import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Validação de forma, não de negócio: dígitos de CPF/CNPJ são problema do core. */
export class CreateClientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  document!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;
}

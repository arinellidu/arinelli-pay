import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateContractDto {
  @IsInt()
  @IsPositive()
  clientId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount!: number;

  @IsInt()
  @Min(1)
  @Max(28)
  billingDay!: number;
}

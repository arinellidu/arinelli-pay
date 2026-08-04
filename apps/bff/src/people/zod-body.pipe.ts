import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodType } from 'zod';
import { errosPorCampo } from './people-schema';

/**
 * Validação por zod NESTE módulo (o resto do BFF usa class-validator): o
 * schema é o mesmo arquivo que o formulário consome (people-schema.ts
 * espelhado), então front e back reprovam o mesmo input com as mesmas
 * mensagens. O 400 sai como { message, fieldErrors } — o formulário mapeia
 * cada entrada de volta para o campo via setError.
 */
@Injectable()
export class ZodBody<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validação falhou',
        fieldErrors: errosPorCampo(result.error),
      });
    }
    return result.data;
  }
}

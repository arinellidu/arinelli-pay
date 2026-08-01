import { HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError } from 'axios';

/** URL do gateway (P05) — único upstream do BFF. */
export const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:8090';

export const HTTP_TIMEOUT_MS = 5_000;

/**
 * Erro de upstream vira resposta fiel: ProblemDetail do core passa intacto;
 * sem resposta (timeout/conexão) vira 502. Zero regra de negócio aqui (ADR-003).
 */
export function rethrowUpstream(error: unknown): never {
  if (error instanceof AxiosError) {
    if (error.response) {
      throw new HttpException(
        error.response.data as Record<string, unknown>,
        error.response.status,
      );
    }
    throw new HttpException(
      {
        title: 'Gateway indisponível',
        detail: `Falha ao falar com o gateway: ${error.code ?? error.message}`,
        status: HttpStatus.BAD_GATEWAY,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
  throw error;
}

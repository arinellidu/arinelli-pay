import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * O contrato "validação front e back sincronizadas" é literal: o schema é o
 * MESMO arquivo, espelhado. Editou um lado só, este teste quebra — e o build
 * do BFF para antes de o formulário e o POST divergirem.
 */
describe('people-schema espelhado', () => {
  it('é idêntico ao apps/web/src/lib/people-schema.ts', () => {
    const normalizado = (caminho: string) =>
      readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n');

    const doBff = normalizado(join(__dirname, 'people-schema.ts'));
    const doWeb = normalizado(
      join(__dirname, '..', '..', '..', 'web', 'src', 'lib', 'people-schema.ts'),
    );

    expect(doBff).toBe(doWeb);
  });
});

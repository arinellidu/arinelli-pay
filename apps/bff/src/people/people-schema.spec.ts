import {
  cnpjValido,
  cpfValido,
  pessoaFisicaSchema,
  pessoaJuridicaSchema,
  telefoneValido,
} from './people-schema';

describe('cpfValido', () => {
  it.each(['52998224725', '11144477735', '93541134780', '15350946056'])(
    'aceita CPF válido %s',
    (cpf) => expect(cpfValido(cpf)).toBe(true),
  );

  it.each([
    '52998224726', // dígito verificador errado
    '11111111111', // sequência repetida
    '00000000000',
    '5299822472', // curto
    '529982247251', // longo
    '5299822472a', // não numérico
  ])('rejeita %s', (cpf) => expect(cpfValido(cpf)).toBe(false));
});

describe('cnpjValido', () => {
  it.each(['11222333000181', '11444777000161'])('aceita CNPJ válido %s', (cnpj) =>
    expect(cnpjValido(cnpj)).toBe(true),
  );

  it.each([
    '11222333000182', // dígito verificador errado
    '11111111111111', // sequência repetida
    '1122233300018', // curto
    '112223330001811', // longo
  ])('rejeita %s', (cnpj) => expect(cnpjValido(cnpj)).toBe(false));
});

describe('telefoneValido', () => {
  it.each(['11987650142', '1130074521'])('aceita %s', (tel) =>
    expect(telefoneValido(tel)).toBe(true),
  );
  it.each(['0187650142', '119876501', '119876501422'])('rejeita %s', (tel) =>
    expect(telefoneValido(tel)).toBe(false),
  );
});

describe('pessoaFisicaSchema', () => {
  it('aceita os obrigatórios primários (nome + CPF + e-mail + telefone), com máscara', () => {
    const parsed = pessoaFisicaSchema.parse({
      nome: '  Ana Souza  ',
      cpf: '529.982.247-25',
      email: 'ana.souza@exemplo.com.br',
      telefone: '(31) 98412-0000',
      cep: '',
    });
    expect(parsed.nome).toBe('Ana Souza');
    expect(parsed.cpf).toBe('52998224725'); // máscara removida na validação
    expect(parsed.email).toBe('ana.souza@exemplo.com.br');
    expect(parsed.telefone).toBe('31984120000');
  });

  it('exige e-mail', () => {
    const result = pessoaFisicaSchema.safeParse({
      nome: 'Ana Souza',
      cpf: '52998224725',
      email: '',
      telefone: '31984120000',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toContain('email');
    }
  });

  it('exige telefone', () => {
    const result = pessoaFisicaSchema.safeParse({
      nome: 'Ana Souza',
      cpf: '52998224725',
      email: 'ana@exemplo.com.br',
      telefone: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toContain('telefone');
    }
  });

  it('reprova CPF com dígito errado apontando o campo', () => {
    const result = pessoaFisicaSchema.safeParse({
      nome: 'Ana Souza',
      cpf: '52998224726',
      email: 'ana@exemplo.com.br',
      telefone: '31984120000',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const campos = result.error.issues.map((issue) => issue.path[0]);
      expect(campos).toContain('cpf');
    }
  });

  it('valida opcionais quando presentes (CEP, UF) e formato de e-mail/telefone', () => {
    const result = pessoaFisicaSchema.safeParse({
      nome: 'Ana Souza',
      cpf: '52998224725',
      email: 'nao-e-email',
      telefone: '12',
      cep: '0131',
      uf: 'São',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const campos = result.error.issues.map((issue) => issue.path[0]);
      expect(campos).toEqual(expect.arrayContaining(['email', 'telefone', 'cep', 'uf']));
    }
  });
});

describe('pessoaJuridicaSchema', () => {
  const valida = {
    razaoSocial: 'Aurora Design LTDA',
    cnpj: '11.222.333/0001-81',
    emailContato: 'contato@aurora.com.br',
    telefoneContato: '(11) 3007-4521',
    responsavelId: '1', // como chega do select do formulário
  };

  it('aceita os obrigatórios primários e normaliza documento e telefone', () => {
    const parsed = pessoaJuridicaSchema.parse(valida);
    expect(parsed.cnpj).toBe('11222333000181');
    expect(parsed.telefoneContato).toBe('1130074521');
    expect(parsed.responsavelId).toBe(1);
  });

  it('exige responsável legal: select vazio reprova no campo', () => {
    const result = pessoaJuridicaSchema.safeParse({ ...valida, responsavelId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const doCampo = result.error.issues.find((issue) => issue.path[0] === 'responsavelId');
      expect(doCampo?.message).toBe('Selecione a pessoa física responsável');
    }
  });

  it.each(['razaoSocial', 'cnpj', 'emailContato', 'telefoneContato'] as const)(
    'exige %s',
    (campo) => {
      const result = pessoaJuridicaSchema.safeParse({ ...valida, [campo]: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((issue) => issue.path[0])).toContain(campo);
      }
    },
  );
});

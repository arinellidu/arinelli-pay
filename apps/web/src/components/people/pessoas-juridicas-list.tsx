"use client";

import { useState } from "react";
import { documentMask } from "@/lib/format";
import { maskTelefone } from "@/lib/masks";
import type { PessoaJuridica } from "@/lib/people-schema";
import { EditableCell } from "./editable-cell";
import { PessoaJuridicaForm, type ResponsavelOption } from "./pessoa-juridica-form";

export function PessoasJuridicasList({
  empresas,
  responsaveis,
}: {
  empresas: PessoaJuridica[];
  responsaveis: ResponsavelOption[];
}) {
  const [editing, setEditing] = useState<PessoaJuridica | null>(null);
  const [open, setOpen] = useState(false);

  // mesma razão da lista de PF: a empresa em edição sobrevive ao fechamento
  // para o diálogo não virar "nova pessoa jurídica" durante a animação de saída
  const abrirEdicao = (empresa: PessoaJuridica) => {
    setEditing(empresa);
    setOpen(true);
  };

  return (
    <>
      <div className="surface-panel surface-frame surface-scan overflow-hidden rounded-xl">
        <div className="surface-well hidden grid-cols-[minmax(12rem,1.1fr)_minmax(9rem,.75fr)_minmax(11rem,.9fr)_minmax(11rem,.9fr)] gap-3 border-b border-white/12 px-4 py-3 text-[9px] font-semibold tracking-[0.17em] text-read-faint uppercase md:grid">
          <span>Empresa</span>
          <span>CNPJ</span>
          <span>Responsável legal</span>
          <span>Contato</span>
        </div>
        <ul>
          {empresas.map((empresa) => (
            <li key={empresa.id} className="border-b border-white/7 last:border-b-0">
              <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(12rem,1.1fr)_minmax(9rem,.75fr)_minmax(11rem,.9fr)_minmax(11rem,.9fr)] md:items-start md:gap-3">
                <EditableCell label="empresa" onEdit={() => abrirEdicao(empresa)}>
                  <p className="font-medium tracking-[-0.01em]">{empresa.razaoSocial}</p>
                  {empresa.nomeFantasia ? (
                    <p className="mt-0.5 text-xs text-read-soft">{empresa.nomeFantasia}</p>
                  ) : null}
                </EditableCell>
                <EditableCell label="CNPJ" onEdit={() => abrirEdicao(empresa)}>
                  <p className="readout text-xs text-read-soft">{documentMask(empresa.cnpj)}</p>
                </EditableCell>
                <EditableCell label="responsável legal" onEdit={() => abrirEdicao(empresa)}>
                  <p className="text-sm">{empresa.responsavel.nome}</p>
                  <p className="readout mt-0.5 text-xs text-read-soft">
                    {documentMask(empresa.responsavel.cpf)}
                  </p>
                </EditableCell>
                <EditableCell label="contato" onEdit={() => abrirEdicao(empresa)}>
                  <p className="text-sm">{empresa.emailContato}</p>
                  <p className="readout mt-0.5 text-xs text-read-soft">
                    {maskTelefone(empresa.telefoneContato)}
                  </p>
                </EditableCell>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <PessoaJuridicaForm
        responsaveis={responsaveis}
        empresa={editing ?? undefined}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

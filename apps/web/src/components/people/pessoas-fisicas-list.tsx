"use client";

import { useState } from "react";
import { documentMask } from "@/lib/format";
import { maskTelefone } from "@/lib/masks";
import type { PessoaFisica } from "@/lib/people-schema";
import { EditableCell } from "./editable-cell";
import { PessoaFisicaForm } from "./pessoa-fisica-form";

export function PessoasFisicasList({ pessoas }: { pessoas: PessoaFisica[] }) {
  const [editing, setEditing] = useState<PessoaFisica | null>(null);
  const [open, setOpen] = useState(false);

  // a pessoa em edição continua montada depois do fechamento: se ela sumisse
  // junto com o `open`, o diálogo trocaria de título e de botão no meio da
  // animação de saída — o formulário viraria "nova pessoa" na frente do usuário
  const abrirEdicao = (pessoa: PessoaFisica) => {
    setEditing(pessoa);
    setOpen(true);
  };

  return (
    <>
      <div className="surface-panel surface-frame surface-scan overflow-hidden rounded-xl">
        <div className="surface-well hidden grid-cols-[minmax(12rem,1.2fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.7fr)_minmax(10rem,.8fr)] gap-3 border-b border-white/12 px-4 py-3 text-[9px] font-semibold tracking-[0.17em] text-read-faint uppercase md:grid">
          <span>Nome</span>
          <span>CPF</span>
          <span>E-mail</span>
          <span>Telefone</span>
          <span>Local</span>
        </div>
        <ul>
          {pessoas.map((pessoa) => {
            const local = pessoa.cidade
              ? `${pessoa.cidade}${pessoa.uf ? ` · ${pessoa.uf}` : ""}`
              : null;

            return (
              <li key={pessoa.id} className="border-b border-white/7 last:border-b-0">
                <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(12rem,1.2fr)_minmax(9rem,.8fr)_minmax(12rem,1fr)_minmax(9rem,.7fr)_minmax(10rem,.8fr)] md:items-start md:gap-3">
                  <EditableCell label="nome" onEdit={() => abrirEdicao(pessoa)}>
                    <p className="font-medium tracking-[-0.01em]">{pessoa.nome}</p>
                  </EditableCell>
                  <EditableCell label="CPF" onEdit={() => abrirEdicao(pessoa)}>
                    <p className="readout text-xs text-read-soft">{documentMask(pessoa.cpf)}</p>
                  </EditableCell>
                  <EditableCell label="e-mail" onEdit={() => abrirEdicao(pessoa)}>
                    <p className="truncate text-xs text-read-soft">
                      {pessoa.email ?? "—"}
                    </p>
                  </EditableCell>
                  <EditableCell label="telefone" onEdit={() => abrirEdicao(pessoa)}>
                    <p className="readout text-xs text-read-soft">
                      {pessoa.telefone ? maskTelefone(pessoa.telefone) : "—"}
                    </p>
                  </EditableCell>
                  <EditableCell label="local" onEdit={() => abrirEdicao(pessoa)}>
                    <p className="text-xs text-read-soft">{local ?? "—"}</p>
                  </EditableCell>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <PessoaFisicaForm pessoa={editing ?? undefined} open={open} onOpenChange={setOpen} />
    </>
  );
}

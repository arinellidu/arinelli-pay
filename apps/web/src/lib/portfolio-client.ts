const BFF = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:3001";

export type PortfolioResult =
  | { ok: true; id: number }
  | { ok: false; message: string };

async function post(path: string, payload: unknown): Promise<PortfolioResult> {
  try {
    const response = await fetch(`${BFF}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as {
      id?: number;
      message?: string | string[];
      detail?: string;
      title?: string;
    } | null;

    if (response.ok && body?.id) return { ok: true, id: body.id };

    const message = Array.isArray(body?.message)
      ? body.message[0]
      : body?.message ?? body?.detail ?? body?.title;
    return {
      ok: false,
      message: message ?? `Não foi possível concluir (HTTP ${response.status})`,
    };
  } catch {
    return { ok: false, message: "Sem sinal do BFF. Tente novamente." };
  }
}

export function cadastrarCliente(payload: {
  document: string;
  name: string;
  email?: string;
}) {
  return post("/bff/clients", payload);
}

export function cadastrarContrato(payload: {
  clientId: number;
  title: string;
  amount: number;
  billingDay: number;
}) {
  return post("/bff/contracts", payload);
}

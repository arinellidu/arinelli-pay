/**
 * Barramento de sinal do instrumento.
 *
 * O campo WebGL do fundo não é wallpaper: ele é acionado por eventos reais do
 * backend. Quem cria uma cobrança segura um `pending`; cada batida do polling
 * de 3s emite um `poll`; a liquidação confirmada pelo webhook emite `settled`.
 * Nada aqui inventa estado — se o campo se move, alguma coisa aconteceu de
 * verdade do outro lado (I7).
 */

const PENDING = "arinelli:pending";
const POLL = "arinelli:poll";
const SETTLED = "arinelli:settled";

let pending = 0;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** Marca que existe cobrança viva na tela; devolve o release (idempotente). */
export function holdPending(): () => void {
  if (!isBrowser()) return () => {};
  pending += 1;
  window.dispatchEvent(new CustomEvent(PENDING, { detail: pending }));
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pending = Math.max(0, pending - 1);
    window.dispatchEvent(new CustomEvent(PENDING, { detail: pending }));
  };
}

/** Uma batida do polling voltou do BFF. */
export function announcePoll(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(POLL));
}

/** O webhook liquidou: o único momento coreografado do app. */
export function announceSettlement(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(SETTLED));
}

export interface SignalHandlers {
  onPending?: (count: number) => void;
  onPoll?: () => void;
  onSettled?: () => void;
}

export function subscribeSignal(handlers: SignalHandlers): () => void {
  if (!isBrowser()) return () => {};
  const pendingListener = (event: Event) =>
    handlers.onPending?.((event as CustomEvent<number>).detail ?? 0);
  const pollListener = () => handlers.onPoll?.();
  const settledListener = () => handlers.onSettled?.();

  window.addEventListener(PENDING, pendingListener);
  window.addEventListener(POLL, pollListener);
  window.addEventListener(SETTLED, settledListener);
  return () => {
    window.removeEventListener(PENDING, pendingListener);
    window.removeEventListener(POLL, pollListener);
    window.removeEventListener(SETTLED, settledListener);
  };
}

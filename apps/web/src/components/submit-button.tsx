"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-corners border-2 border-ink bg-paper px-3 py-1.5 text-xs font-bold tracking-[0.14em] hover:bg-ink hover:text-paper disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-lg border border-brand-dark/20 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-brand-light aria-invalid:border-red-600 aria-invalid:ring-red-600/20";

export function Campo({
  etiqueta,
  htmlFor,
  error,
  ayuda,
  opcional = false,
  className,
  children,
}: {
  etiqueta: ReactNode;
  htmlFor: string;
  error?: string;
  ayuda?: ReactNode;
  opcional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-brand-dark">
        {etiqueta}
        {opcional && <span className="ml-1 font-normal text-ink/50">(opcional)</span>}
      </label>
      {children}
      {ayuda && !error && (
        <p id={`${htmlFor}-ayuda`} className="text-xs text-ink/60">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-28", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "pr-8", className)} {...props} />;
}

/** Props de accesibilidad para un control con posible error. */
export function ariaCampo(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : `${id}-ayuda`,
  } as const;
}

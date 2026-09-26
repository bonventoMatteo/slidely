"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logClientError } from "@/lib/client-log";

export function ErrorState({ error, reset, title = "Algo deu errado" }: { error: Error & { digest?: string }; reset: () => void; title?: string }) {
  useEffect(() => {
    logClientError("ui_error_boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" aria-hidden />
      </div>
      <h1 className="mt-5 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Não conseguimos carregar esta página. Tente novamente — se persistir, recarregue o navegador.
      </p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-muted-foreground">Código: {error.digest}</p> : null}
      <Button onClick={reset} className="mt-6">
        <RotateCcw aria-hidden /> Tentar novamente
      </Button>
    </div>
  );
}

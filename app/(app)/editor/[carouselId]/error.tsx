"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function EditorError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="O editor encontrou um erro" />;
}

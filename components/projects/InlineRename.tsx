"use client";

import { Check, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Edição inline de título com commit otimista (onCommit pode falhar e reverter). */
export function InlineRename({
  value,
  onCommit,
  className,
  inputClassName,
  label = "Renomear",
}: {
  value: string;
  onCommit: (next: string) => Promise<boolean>;
  className?: string;
  inputClassName?: string;
  label?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [display, setDisplay] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDisplay(value), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === display) return;
    const previous = display;
    setDisplay(next); // otimista
    const ok = await onCommit(next);
    if (!ok) setDisplay(previous);
  }

  if (editing) {
    return (
      <form
        className={cn("flex items-center gap-1", className)}
        onSubmit={(e) => {
          e.preventDefault();
          void commit();
        }}
      >
        <Input
          ref={inputRef}
          value={draft}
          maxLength={80}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
          className={inputClassName}
        />
        <Button type="submit" size="icon-sm" variant="ghost" aria-label="Salvar nome">
          <Check aria-hidden />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" aria-label="Cancelar" onClick={() => setEditing(false)}>
          <X aria-hidden />
        </Button>
      </form>
    );
  }

  return (
    <span className={cn("group/rename inline-flex min-w-0 items-center gap-2", className)}>
      <span className="truncate">{display}</span>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={label}
        className="opacity-60 group-hover/rename:opacity-100"
        onClick={() => {
          setDraft(display);
          setEditing(true);
        }}
      >
        <Pencil aria-hidden />
      </Button>
    </span>
  );
}

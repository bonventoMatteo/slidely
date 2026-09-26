import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiErrorBody = { error: string; code: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(status: number, code: string, error: string, headers?: HeadersInit) {
  return NextResponse.json<ApiErrorBody>({ error, code }, { status, headers });
}

export function zodErrorResponse(err: ZodError) {
  const first = err.issues[0];
  const path = first?.path.join(".");
  const message = first ? (path ? `${path}: ${first.message}` : first.message) : "Entrada inválida";
  return errorResponse(400, "invalid_input", message);
}

/** Converte exceções em respostas `{ error, code }` e loga o contexto no servidor. */
export function handleRouteError(err: unknown, context: Record<string, unknown>) {
  if (err instanceof ApiError) {
    if (err.status >= 500) logError(err.message, { ...context, code: err.code });
    return errorResponse(err.status, err.code, err.message, err.headers);
  }
  logError("unhandled_route_error", { ...context, err });
  return errorResponse(500, "internal_error", "Erro interno. Tente novamente em instantes.");
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Corpo da requisição não é um JSON válido");
  }
}

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

export function logError(message: string, context: Record<string, unknown> = {}) {
  const payload = Object.fromEntries(Object.entries(context).map(([k, v]) => [k, serialize(v)]));
  console.error(JSON.stringify({ level: "error", message, ...payload, ts: new Date().toISOString() }));
}

export function logInfo(message: string, context: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ level: "info", message, ...context, ts: new Date().toISOString() }));
}

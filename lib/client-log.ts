/** Log estruturado no navegador (mesmo formato do servidor). */
export function logClientError(message: string, err: unknown, context: Record<string, unknown> = {}) {
  const error = err instanceof Error ? { name: err.name, message: err.message } : err;
  console.error(JSON.stringify({ level: "error", message, error, ...context, ts: new Date().toISOString() }));
}

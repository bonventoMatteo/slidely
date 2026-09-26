/** Erro de API com o `code` retornado pelo servidor. */
export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ClientApiError";
  }
}

/** POST JSON para as rotas internas, lançando ClientApiError com a mensagem do servidor. */
export function postJson<T>(url: string, body: unknown, init?: { signal?: AbortSignal }): Promise<T> {
  return requestJson<T>("POST", url, body, init);
}

export async function requestJson<T>(
  method: "POST" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
  init?: { signal?: AbortSignal },
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: init?.signal,
    });
  } catch {
    throw new ClientApiError("Sem conexão com o servidor. Verifique sua internet.", "network_error", 0);
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const payload = (data ?? {}) as { error?: unknown; code?: unknown };
    throw new ClientApiError(
      typeof payload.error === "string" ? payload.error : "Algo deu errado. Tente novamente.",
      typeof payload.code === "string" ? payload.code : "unknown_error",
      res.status,
    );
  }
  return data as T;
}

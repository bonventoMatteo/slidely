"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ background: "#0a0a0a", color: "#fafafa", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "20vh auto", textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22 }}>Algo deu muito errado</h1>
          <p style={{ color: "#a3a3a3" }}>Recarregue a página. Se continuar, tente novamente em alguns minutos.</p>
          <button
            onClick={reset}
            style={{ marginTop: 16, padding: "10px 18px", borderRadius: 8, border: 0, background: "#ff7a1a", color: "#0a0a0a", fontWeight: 700, cursor: "pointer" }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}

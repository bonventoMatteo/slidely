# slidely

Gerador de carrosséis profissionais para Instagram. O usuário escolhe um template, informa o tema (ou cola o link de uma matéria), o Claude escreve o roteiro e as artes são montadas na hora. Editor visual com auto-save e export em PNG/ZIP/PDF (1080×1350).

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind v4 + shadcn/ui (Radix) · Supabase (Postgres, Auth, Storage, RLS) · Anthropic SDK · Satori + resvg (via `next/og`, WebAssembly) · pdf-lib · JSZip · Stripe · Zustand · dnd-kit · framer-motion.

---

## Marca

| Token | Valor | Uso |
|---|---|---|
| `brand-dark` | `#0a0a0a` | Fundo (preto do ícone) |
| `brand-surface` | `#141414` | Cards e superfícies |
| `brand-orange` / `primary` | `#ff7a1a` | Ações primárias, foco, destaques |
| `brand-coral` | `#ff5b5d` | Meio do gradiente |
| `brand-pink` | `#ff4d9d` | Fim do gradiente |

Gradiente da marca: `linear-gradient(135deg, #ff7a1a, #ff5b5d, #ff4d9d)` (classes `bg-gradient-brand` / `text-gradient-brand`). Sobre o gradiente, use texto `brand-dark`: o contraste fica entre 6,4 e 7,6:1, contra 2,6:1 com branco.

Arquivos: `public/brand/` (wordmark branco e preto, ícone 512 px), `app/icon.png`, `app/apple-icon.png` e `app/opengraph-image.png`. O símbolo em SVG está em `components/shared/Logo.tsx` (`LogoMark`).

## Design dos slides

- **32 templates**, sendo 13 da Coleção Pro, com 15 layouts: 7 essenciais e 8 Pro (post estilo X/Threads, revista, checklist, número em destaque, vidro, neo brutal, foto cheia e foto + texto).
- **Texto rico:** `**palavra**` vira destaque (cor, marca-texto ou sublinhado, conforme o tema) e linhas com `- ` viram lista.
- **Formato por slide** (`text`, `list`, `stat`, `quote`): a IA classifica cada slide e o template escolhe o layout ideal (`formats` em `lib/templates-catalog.ts`).
- **Fotos reais (opcional):** com `PEXELS_API_KEY`, a IA sugere a busca da capa (`photo_query`), a geração aplica uma foto automaticamente e o editor tem a aba Fotos. Licença Pexels: livre para uso comercial.
- **Acabamento:** grão de filme (`public/textures/grain.png`) e ajustes por slide (tamanho do texto, alinhamento, posição e escurecimento da foto).
- Tudo é renderizado pelo mesmo componente no editor e no export (`lib/render/layouts.tsx`), inclusive o texto rico, feito palavra a palavra porque o Satori não quebra linha em spans aninhados.

## Rodando localmente

Requisitos: Node 20.9+ e pnpm 10.

```bash
pnpm install
cp .env.example .env.local   # preencha as variáveis (tabela abaixo)
# aplique as migrations (seção "Banco de dados")
pnpm dev
```

Abra http://localhost:3000.

| Comando | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento (Turbopack) |
| `pnpm build` / `pnpm start` | Build e servidor de produção |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm seed:templates` | Regenera `0002_seed_templates.sql` a partir de `lib/templates-catalog.ts` |
| `pnpm showcase` | Re-renderiza os slides reais da landing em `public/showcase/` (rode após mudar templates/layouts) |

## Variáveis de ambiente

| Variável | Onde obter | Exposta ao client? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem (anon/public key) | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (service_role) | **não** |
| `ANTHROPIC_API_KEY` | console.anthropic.com | **não** |
| `ANTHROPIC_MODEL` | opcional, padrão `claude-sonnet-4-5` | **não** |
| `PEXELS_API_KEY` | opcional, grátis em pexels.com/api (fotos reais) | **não** |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys (modo teste) | **não** |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen` (local) ou endpoint do webhook (produção) | **não** |
| `STRIPE_PRICE_PRO` | ID do preço mensal R$49 (`price_...`) | **não** |
| `STRIPE_PRICE_BUSINESS` | ID do preço mensal R$149 | **não** |
| `NEXT_PUBLIC_APP_URL` | URL pública do app | sim |

As chaves secretas só são lidas em route handlers e módulos marcados com `server-only`. Um import acidental no client quebra o build.

## Banco de dados (Supabase)

Aplique as migrations **em ordem**:

| Arquivo | Conteúdo |
|---|---|
| `0001_init.sql` | Tabelas, índices, triggers, RLS, RPCs (quota, rate limit, auto-save), buckets e policies de Storage |
| `0002_seed_templates.sql` | 32 templates públicos (gerado por `pnpm seed:templates`) |
| `0003_backfill_profiles.sql` | Cria `profiles` para usuários que já existiam antes do trigger |
| `0004_fix_owned_refs.sql` | Corrige os triggers de validação de posse (projetos/carrosséis) |

**Com a CLI:**
```bash
supabase link --project-ref <ref>
supabase db push
```

**Sem a CLI:** cole cada arquivo, na ordem, no SQL Editor do painel. Todos são idempotentes a partir da 0002.

Tipos do banco: `lib/supabase/database.types.ts` segue o formato do gerador. Depois de alterar o schema, regenere:
```bash
supabase gen types typescript --linked > lib/supabase/database.types.ts
```

**Auth:** em Authentication → URL Configuration, defina *Site URL* com `NEXT_PUBLIC_APP_URL` e adicione `<APP_URL>/auth/callback` em *Redirect URLs* (confirmação de e-mail via PKCE).

## Stripe (modo teste)

1. Crie dois produtos com preço **recorrente mensal em BRL**: Pro (R$49) e Business (R$149). Copie os `price_...` para `STRIPE_PRICE_PRO` e `STRIPE_PRICE_BUSINESS`.
2. Ative o **Customer Portal** (Settings → Billing → Customer portal), permitindo troca de plano e cancelamento.
3. Webhook local:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Use o `whsec_...` impresso em `STRIPE_WEBHOOK_SECRET`.
4. Em produção, crie o endpoint `https://<domínio>/api/stripe/webhook` com os eventos `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`.

Cartão de teste: `4242 4242 4242 4242`, qualquer data futura e CVC.

O webhook verifica a assinatura e sempre relê a assinatura na API do Stripe antes de atualizar `profiles.plan`, porque eventos podem chegar fora de ordem. Quem já assina troca de plano pelo portal.

## Deploy na Vercel

1. Importe o repositório na Vercel (framework Next.js detectado automaticamente).
2. Cadastre todas as variáveis da tabela acima em *Settings → Environment Variables*, com `NEXT_PUBLIC_APP_URL` apontando para o domínio final.
3. Aplique as migrations no projeto Supabase de produção.
4. Configure o webhook do Stripe de produção e as URLs de Auth do Supabase para o domínio final.

As rotas `/api/generate` e `/api/render` declaram `maxDuration = 60`. No plano Hobby o limite padrão é menor: use Pro ou reduza a quantidade de slides. O render usa o `ImageResponse` do `next/og` (Satori + resvg em WebAssembly), sem binários nativos. As fontes ficam em `public/fonts`: entram no bundle da rota via `outputFileTracingIncludes` e, se faltarem no disco, são baixadas do próprio site em `/fonts/`.

---

## Arquitetura

```
app/
  (marketing)/page.tsx          landing
  (auth)/login, signup          formulários (react-hook-form + zod)
  auth/callback, auth/signout   PKCE e logout
  (app)/…                       área logada (sidebar; compacta no editor)
  api/generate                  Claude → carrossel completo
  api/generate/slide            Claude → reescreve 1 slide
  api/render                    Satori → PNG/ZIP/PDF → Storage → URLs assinadas
  api/stripe/{checkout,portal,webhook}
components/
  editor/                       Canvas, SlideList (dnd-kit), Toolbar, TextPanel, LayoutPicker, ColorPanel, auto-save
  brand-kit/, templates/, carousel/, projects/, billing/, shared/, slide/, ui/ (shadcn)
lib/
  anthropic.ts                  prompts, chamada, validação Zod + 1 retry, custo
  render/layouts.tsx            7 layouts isomórficos (Satori e navegador)
  render/satori.ts, fonts.ts    pipeline server-side (next/og + public/fonts)
  source.ts                     leitura de link com proteção SSRF
  schemas/*.zod.ts              contratos de I/O
  stores/editor.store.ts        Zustand (store por instância via contexto)
  supabase/{client,server,middleware}.ts
supabase/migrations/            SQL versionado
```

### Decisões importantes

- **WYSIWYG real.** Os layouts usam apenas estilos inline compatíveis com Satori. O mesmo componente renderiza o canvas do editor, as prévias de templates e o PNG exportado, então o que aparece no editor é exatamente o que sai no export.
- **Quota atômica.** `consume_generation_quota` reserva a geração antes de chamar o Claude (com `FOR UPDATE`, sem corrida). Em caso de falha, `refund_generation_quota` devolve. O reset acontece quando `monthly_reset_at` tem mais de 30 dias.
- **Rate limit via Postgres.** `consume_rate_limit` usa janela deslizante com advisory lock. Os limites são 10 req/min em `/api/generate`, 20 req/min em `/api/render` e um teto diário de regenerações de slide por plano.
- **Colunas sensíveis protegidas.** A policy `own profile` da spec permitiria ao usuário editar o próprio `plan`. O `UPDATE` em `profiles` foi revogado para `authenticated`, exceto a coluna `full_name`. Plano, contadores e billing só mudam via service role.
- **Limite de brand kits no banco.** Um trigger `enforce_brand_kit_limit` garante o limite mesmo com escrita direta via client.
- **Auto-save transacional.** A RPC `save_carousel_slides` apaga, faz upsert e reordena numa transação. A unique `(carousel_id, position)` é `DEFERRABLE` e o save usa debounce de 800 ms.
- **Tema por carrossel.** O tema (template + brand kit) é resolvido na criação e salvo em `carousels.theme`. Editar cores e fontes no editor não altera o brand kit.
- **Link como fonte.** Quando o link é colado, o servidor busca a página com validação de IP no momento da conexão (bloqueia redes privadas e DNS rebinding), com limite de 3 MB e 10 s. O prompt trata o conteúdo como dado, não como instrução.
- **Imagens no render.** Só são baixadas imagens do Storage do próprio projeto Supabase, como proteção contra SSRF.

### Planos

| | Free | Pro (R$49) | Business (R$149) |
|---|---|---|---|
| Carrosséis/mês | 5 | 100 | ilimitado |
| Brand kits | 1 | 5 | 20 |
| Export PDF | — | ✓ | ✓ |
| Marca d'água | ✓ | — | — |
| Templates exclusivos | — | — | ✓ |

A configuração fica em `lib/plans.ts`. O limite de brand kits também está no trigger SQL, então mantenha os dois em sincronia.

### Limitações conhecidas

- A "capa" é gerada por IA no texto (gancho + sugestão visual). Não há geração de imagem, porque a stack não inclui provedor de imagem. O usuário pode enviar uma foto de capa (layouts *Gancho forte* e *Editorial*).
- O editor é desktop-only (exibe aviso em telas < 1024 px).

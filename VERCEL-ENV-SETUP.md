# ⚙️ CyberShield — Configuração das Variáveis no Vercel

Após fazer o push para o GitHub e conectar ao Vercel, acesse:
**Vercel Dashboard → Seu Projeto → Settings → Environment Variables**

Adicione cada linha abaixo como uma variável separada.

---

## ✅ Variáveis já prontas para colar

```
SUPABASE_URL
https://qpqxjbbpztjsisiybphp.supabase.co
```

```
JWT_SECRET
9b901d4ef66d8366c1ba345fe74249d375e7e41e60a0315e561611b5e2893aa0dc428f87460b4b8e618602a4414eccca
```

```
VIRUSTOTAL_API_KEY
3d2b36f72b98f010fe56c6005117ffce1ba0e898f9190237f76631b740c85f2c
```

---

## ⚠️ Variáveis que você ainda precisa pegar

### SUPABASE_SERVICE_KEY
A chave que você forneceu (`sb_publishable_...`) é a chave **anon/pública**.
O backend precisa da chave **service_role** que tem acesso total ao banco.

**Onde pegar:**
1. Acesse https://supabase.com → seu projeto `qpqxjbbpztjsisiybphp`
2. Settings → API
3. Copie a chave em **"service_role"** (clique em "Reveal")

```
SUPABASE_SERVICE_KEY
eyJhbGci... (a chave service_role começa com eyJ)
```

### STRIPE_SECRET_KEY
```
STRIPE_SECRET_KEY
sk_live_... (ou sk_test_... para testes)
```
Onde: dashboard.stripe.com → Developers → API Keys

### STRIPE_PRICE_BASE
```
STRIPE_PRICE_BASE
price_... (do produto CyberShield Base R$39,90)
```
Onde: dashboard.stripe.com → Products → Base → copie o Price ID

### STRIPE_PRICE_PLUS
```
STRIPE_PRICE_PLUS
price_... (do produto CyberShield Plus R$59,90)
```

### STRIPE_WEBHOOK_SECRET
```
STRIPE_WEBHOOK_SECRET
whsec_...
```
Onde: dashboard.stripe.com → Developers → Webhooks → Add endpoint
URL: `https://SEU-PROJETO.vercel.app/api/webhook`
Eventos: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_succeeded`

### NEXT_PUBLIC_APP_URL
```
NEXT_PUBLIC_APP_URL
https://SEU-PROJETO.vercel.app
```
Preencha após o primeiro deploy com a URL gerada pelo Vercel.

---

## Resumo de todas as variáveis

| Variável | Status |
|---|---|
| `SUPABASE_URL` | ✅ Pronta acima |
| `SUPABASE_SERVICE_KEY` | ⚠️ Pegar em supabase.com → service_role |
| `JWT_SECRET` | ✅ Pronta acima |
| `STRIPE_SECRET_KEY` | ⚠️ Pegar no Stripe Dashboard |
| `STRIPE_PRICE_BASE` | ⚠️ Criar produto no Stripe |
| `STRIPE_PRICE_PLUS` | ⚠️ Criar produto no Stripe |
| `STRIPE_WEBHOOK_SECRET` | ⚠️ Criar webhook no Stripe |
| `NEXT_PUBLIC_APP_URL` | ⚠️ Preencher após primeiro deploy |
| `VIRUSTOTAL_API_KEY` | ✅ Pronta acima |

---

## Banco de dados

Após configurar o Supabase, rode o SQL em `supabase-schema.sql`:
1. supabase.com → seu projeto → **SQL Editor** → New query
2. Cole o conteúdo do arquivo → **Run**

# 🛡 CyberShield — Detector de Golpes Online

Sistema SaaS de cibersegurança para detectar golpes em links, chaves PIX, perfis de redes sociais e mensagens suspeitas.

**Stack:** Next.js · Supabase · Stripe · VirusTotal API

---

## Deploy

1. Faça o push deste repositório para o GitHub
2. No Vercel, importe o repositório
3. Siga o arquivo **`VERCEL-ENV-SETUP.md`** para adicionar as variáveis de ambiente
4. Execute o **`supabase-schema.sql`** no Supabase SQL Editor

## Planos

| | Gratuito | Base R$39,90/mês | Plus R$59,90/mês |
|---|---|---|---|
| Consultas | 5 | 100/mês | Ilimitadas |
| VirusTotal | ❌ | ✅ | ✅ |
| Google Safe Browsing | ❌ | ✅ | ✅ |
| Histórico | ❌ | ✅ | ✅ |

## Segurança

- Senhas com **bcrypt** (salt 12)
- Sessões via **JWT** em cookie `httpOnly/SameSite/Secure`
- Limites verificados **no servidor** — impossível burlar pelo browser
- Rate limiting por IP em todas as rotas
- Webhook Stripe com **verificação de assinatura criptográfica**
- Chaves de API nunca expostas no frontend

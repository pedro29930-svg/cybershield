import Stripe from 'stripe'
import { requireAuth } from '../../lib/auth'
import supabase from '../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

const PRICE_MAP = { base: process.env.STRIPE_PRICE_BASE, plus: process.env.STRIPE_PRICE_PLUS }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const payload = requireAuth(req, res)
  if (!payload) return

  const { plan } = req.body || {}
  if (!plan || !PRICE_MAP[plan])        return res.status(400).json({ error: 'Plano inválido.' })
  if (!PRICE_MAP[plan])                 return res.status(500).json({ error: `STRIPE_PRICE_${plan.toUpperCase()} não configurado.` })

  const { data: user } = await supabase
    .from('users').select('id, email, name, stripe_customer_id').eq('id', payload.userId).single()
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    let customerId = user.stripe_customer_id
    if (!customerId) {
      const c = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } })
      customerId = c.id
      await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded', mode: 'subscription', customer: customerId,
      line_items: [{ price: PRICE_MAP[plan], quantity: 1 }],
      subscription_data: { metadata: { userId: user.id, plan } },
      metadata: { userId: user.id, plan },
      allow_promotion_codes: true,
      return_url: `${appUrl}/app.html?payment=success&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
    })

    return res.status(200).json({ clientSecret: session.client_secret })
  } catch (err) {
    console.error('[checkout]', err.message)
    return res.status(500).json({ error: 'Erro ao criar sessão de pagamento.' })
  }
}

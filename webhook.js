import Stripe from 'stripe'
import { buffer } from 'micro'
import supabase from '../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
export const config = { api: { bodyParser: false } }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig    = req.headers['stripe-signature']
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) return res.status(400).send('Webhook mal configurado')

  let event
  try {
    event = stripe.webhooks.constructEvent(await buffer(req), sig, secret)
  } catch (err) {
    console.error('[webhook] Assinatura inválida:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object
      if (s.mode !== 'subscription') break
      const { userId, plan } = s.metadata || {}
      if (!userId || !plan) break
      await supabase.from('users').update({
        plan, scans_used: 0,
        stripe_subscription_id: s.subscription,
        plan_activated_at: new Date().toISOString(),
      }).eq('id', userId)
      console.log(`[webhook] Plano "${plan}" ativado → user ${userId}`)
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      const filter = userId
        ? supabase.from('users').update({ plan:'free', scans_used:0, stripe_subscription_id:null }).eq('id', userId)
        : supabase.from('users').update({ plan:'free', scans_used:0, stripe_subscription_id:null }).eq('stripe_subscription_id', sub.id)
      await filter
      break
    }
    case 'invoice.payment_succeeded': {
      const inv = event.data.object
      if (!inv.subscription) break
      await supabase.from('users').update({ scans_used: 0 })
        .eq('stripe_subscription_id', inv.subscription)
        .neq('plan', 'free')
      break
    }
  }

  return res.status(200).json({ received: true })
}

import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { session_id } = req.query
  if (!session_id) return res.status(400).json({ error: 'session_id obrigatório' })
  try {
    const s = await stripe.checkout.sessions.retrieve(session_id)
    return res.status(200).json({
      status: s.status, customerEmail: s.customer_details?.email || null,
      plan: s.metadata?.plan || null, userId: s.metadata?.userId || null,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao verificar sessão.' })
  }
}

import bcrypt from 'bcryptjs'
import supabase from '../../../lib/supabase'
import { signToken, makeTokenCookie } from '../../../lib/auth'
import { rateLimit } from '../../../lib/rateLimit'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  if (!rateLimit(req, res, { max: 15, windowMs: 60_000 })) return

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'E-mail e senha obrigatórios.' })

  const emailLower = email.toLowerCase().trim()

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, password_hash, plan, scans_used')
    .eq('email', emailLower)
    .maybeSingle()

  // Sempre compara (evita timing attack para enumerar e-mails)
  const dummyHash = '$2a$12$invalidhashtopreventtimingattack000000000000000000000'
  const valid = user
    ? await bcrypt.compare(password, user.password_hash)
    : await bcrypt.compare(password, dummyHash).then(() => false)

  if (!user || !valid) return res.status(401).json({ error: 'E-mail ou senha incorretos.' })

  const { data: scans } = await supabase
    .from('scans')
    .select('input, score, status, input_type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(15)

  const history = (scans || []).map(s => ({
    query: s.input, score: s.score, status: s.status,
    inputType: s.input_type, ts: new Date(s.created_at).getTime(),
  }))

  const token = signToken({ userId: user.id, email: user.email, plan: user.plan })
  res.setHeader('Set-Cookie', makeTokenCookie(token))

  return res.status(200).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, scansUsed: user.scans_used, history }
  })
}
